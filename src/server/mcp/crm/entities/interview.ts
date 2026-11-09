import "server-only"
import { z } from "zod"

import {
  InterviewDecision,
  InterviewFormat,
  InterviewOutcome,
  InterviewSide,
  InterviewStatus,
  InterviewType,
} from "@/generated/prisma/browser"
import type { Prisma } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { interviewDetailsTemplate } from "@/lib/crm/details-templates"
import { interviewPlaces, interviewTitle } from "@/lib/crm/interviews"
import { interviewIdSchema, opportunityIdSchema, personIdSchema } from "@/lib/ids"
import { instantOf } from "@/lib/schemas/prospecting-action"
import { mapDefined } from "@/lib/utils"
import { revalidatePersonLists } from "@/server/crm/person-guards"
import {
  createInterview,
  updateInterview,
  type CorrespondentExists,
  type InterviewPatchWithoutNewCorrespondents,
  type InterviewWriteError,
} from "@/server/crm/interviews"
import {
  findInterviewByIdForAdmin,
  findInterviewSearchRows,
  findInterviewsPage,
} from "@/server/queries/interviews"

import { dateRange } from "../date-range"
import { defineCrmEntity, joinHint } from "../entity-definition"
import { details, notes } from "../fields"
import { personRef } from "../person-ref"
import { idOrderBy, pageQueryShape, type SortOrder } from "../query-page"
import { writeRecord, type WriteTexts } from "../results"
import { updateSchemaOf } from "../update-input"

const entityField = z.literal("interview").describe('Type of CRM record: always "interview" here.')

const isoInstant = instantOf(
  "Expected an ISO 8601 date and time with its UTC offset, e.g. 2026-11-20T10:00:00+01:00.",
)

// Les `.describe()` arrivent au modèle. `null` efface un champ facultatif, un champ absent d'un patch reste inchangé.
const fieldShape = {
  opportunityId: opportunityIdSchema.describe(
    "Id of the opportunity the interview belongs to. Get it from crm_search with the entity opportunity.",
  ),
  side: z
    .enum(InterviewSide)
    .describe(
      "Who runs the interview: ESN (the opportunity must have an intermediary) or CLIENT_FINAL.",
    ),
  correspondentIds: z
    .array(personIdSchema)
    .describe(
      "Ids of the persons met, existing and not opted out (crm_search with the entity contact or lead). On update, the list replaces the whole previous one: send it complete, or omit it to keep it.",
    ),
  type: z
    .enum(InterviewType)
    .describe("Type: PREMIER_CONTACT, RECRUTEUR_RH, TECHNIQUE, MANAGER_EQUIPE or NEGOCIATION."),
  format: z
    .enum(InterviewFormat)
    .nullable()
    .describe("Format: PRESENTIEL, VISIO or TELEPHONE. null clears it."),
  status: z.enum(InterviewStatus).describe("Status: PLANIFIE, FAIT or ANNULE."),
  outcome: z
    .enum(InterviewOutcome)
    .nullable()
    .describe(
      "Outcome: POSITIF, NEGATIF or SANS_SUITE. Kept only when the status is FAIT, cleared otherwise. null clears it.",
    ),
  scheduledAt: isoInstant.describe(
    "Date and time of the interview, ISO 8601 with its UTC offset (e.g. 2026-11-20T10:00:00+01:00).",
  ),
  score: z.number().int().min(0).max(10).nullable().describe("Score from 0 to 10. null clears it."),
  decision: z
    .enum(InterviewDecision)
    .nullable()
    .describe(
      "Whether to continue the process: OUI_TRES_INTERESSE, OUI_SOUS_CONDITIONS or NON. null clears it.",
    ),
  notes: notes(),
  details,
} as const

const createDataSchema = z
  .strictObject({
    opportunityId: fieldShape.opportunityId,
    side: fieldShape.side,
    type: fieldShape.type,
    scheduledAt: fieldShape.scheduledAt,
    correspondentIds: fieldShape.correspondentIds.default([]),
    format: fieldShape.format.default(null),
    status: fieldShape.status.default("PLANIFIE"),
    outcome: fieldShape.outcome.default(null),
    score: fieldShape.score.default(null),
    decision: fieldShape.decision.default(null),
    notes: fieldShape.notes.default(null),
    details: fieldShape.details
      .optional()
      .describe(
        "Whole Details text in markdown. Omit it to get the standard section template of the interview type. null creates the interview without Details.",
      ),
  })
  .describe(
    "Fields of the interview to create. Required: opportunityId, side, type and scheduledAt.",
  )

const updateFieldsSchema = z
  .strictObject(fieldShape)
  .partial()
  .describe("Fields to change. A field left out stays unchanged, null clears an optional field.")

const interviewFilterSchema = z
  .strictObject({
    status: z.enum(InterviewStatus).optional().describe("Only this status."),
    type: z.enum(InterviewType).optional().describe("Only this type."),
    side: z.enum(InterviewSide).optional().describe("Only this side."),
    opportunityId: opportunityIdSchema
      .optional()
      .describe("Only the interviews of this opportunity."),
    scheduledAt: dateRange(isoInstant)
      .optional()
      .describe("Only the interviews scheduled within this interval, ISO 8601 instants."),
  })
  .describe("Filters, combined with AND.")

const querySchema = z.strictObject({
  entity: entityField,
  filters: interviewFilterSchema.optional(),
  ...pageQueryShape,
})

const createSchema = z.strictObject({ entity: entityField, data: createDataSchema })

const updateSchema = updateSchemaOf(
  entityField,
  interviewIdSchema.describe("Id of the interview to update. Get it from crm_search first."),
  updateFieldsSchema,
)

type QueryInput = z.output<typeof querySchema>
type UpdateInput = z.output<typeof updateSchema>

const toDate = (instant: string | undefined): Date | undefined =>
  mapDefined(instant, (value) => new Date(value))

function toWhere(filters: QueryInput["filters"]): Prisma.InterviewWhereInput {
  const range = filters?.scheduledAt
  return {
    status: filters?.status,
    type: filters?.type,
    side: filters?.side,
    opportunityId: filters?.opportunityId,
    scheduledAt: range && { gte: toDate(range.from), lte: toDate(range.to) },
  }
}

// Un entretien n'a pas de nom : « name » range par opportunité puis par date.
const nameOrder = (order: SortOrder): Prisma.InterviewOrderByWithRelationInput[] => [
  { opportunity: { title: order } },
  { scheduledAt: order },
]

function toPatch({
  fields = {},
  detailsSection,
}: UpdateInput): InterviewPatchWithoutNewCorrespondents {
  const { scheduledAt, ...rest } = fields
  return { ...rest, scheduledAt: toDate(scheduledAt), detailsSection }
}

// Chaque code devient un message qui nomme la correction : l'agent corrige l'appel sans deviner.
function interviewWriteErrorMessage(
  error: Exclude<InterviewWriteError, CorrespondentExists>,
): string {
  switch (error.code) {
    case "opportunity_not_found":
      return "No opportunity has this opportunityId. Call crm_search with the entity opportunity to find the right id, then call the tool again."
    case "opportunity_without_intermediary":
      return "This opportunity has no intermediary, so the interview cannot be run by the ESN. Send side CLIENT_FINAL, or set the intermediaryId of the opportunity with crm_update first."
    case "correspondent_not_found":
      return "A correspondentIds entry matches no person, or a person who opted out of prospecting. Call crm_search with the entity contact to find the right ids, then call the tool again."
    case "not_found":
      return "No interview has this id. Call crm_search to find the right id, then call the tool again."
    case "no_details":
      return "This interview has no Details text, so no section can be replaced. Write the whole text with fields.details instead."
    case "section_not_found":
      return `No section of the Details matches detailsSection.heading. Sections present: ${error.headings.join(", ")}. Use one of these titles.`
    default:
      return assertNever(error)
  }
}

// Un create n'a pas d'id à relire : les entretiens de l'opportunité disent si celui-ci existe déjà avant de réessayer.
const CREATE_WRITE: WriteTexts = {
  events: { success: "interview:created", failure: "interview:create_failed" },
  failureMessage:
    "The interview could not be saved because of an internal error. Call crm_query with the opportunityId filter to check whether it was created before retrying.",
}

const UPDATE_WRITE: WriteTexts = {
  events: { success: "interview:updated", failure: "interview:update_failed" },
  failureMessage:
    "The interview could not be saved because of an internal error. Call crm_fetch to check its current state before retrying.",
}

export const interviewEntity = defineCrmEntity({
  entity: "interview",
  async search(query) {
    const needle = normalizeForSearch(query)
    const interviews = await findInterviewSearchRows()
    const places = interviewPlaces(interviews)
    return interviews
      .map((interview) => ({
        interview,
        title: interviewTitle(interview.type, places.get(interview.id)?.number ?? null),
      }))
      .filter(({ interview, title }) => matchesSearch(needle, title, interview.opportunity.title))
      .map(({ interview, title }) => ({
        entity: "interview" as const,
        id: interview.id,
        label: title,
        hint: joinHint(interview.opportunity.title, interview.scheduledAt.toISOString()),
      }))
  },
  async fetch(id) {
    const interview = await findInterviewByIdForAdmin(id)
    if (!interview) return null

    // Un correspondant opposé n'est connu que par son identifiant : ni email ni LinkedIn ne sortent d'un outil.
    const {
      correspondents,
      opportunity: { interviews, ...opportunity },
      ...record
    } = interview
    const places = interviewPlaces(interviews)
    return {
      ...record,
      title: interviewTitle(record.type, places.get(record.id)?.number ?? null),
      opportunity,
      correspondents: correspondents.map(personRef),
    }
  },
  querySchema,
  async query({ filters, sort, order, limit, offset }) {
    const { rows, total } = await findInterviewsPage({
      where: toWhere(filters),
      orderBy: idOrderBy(sort, order, nameOrder),
      take: limit,
      skip: offset,
    })
    return {
      rows: rows.map(({ number, ...row }) => ({ ...row, title: interviewTitle(row.type, number) })),
      total,
    }
  },
  createSchema,
  create: ({ data }, ctx) =>
    writeRecord(
      () =>
        createInterview({
          ...data,
          scheduledAt: new Date(data.scheduledAt),
          details: data.details === undefined ? interviewDetailsTemplate(data.type) : data.details,
        }),
      ctx,
      CREATE_WRITE,
      {},
      interviewWriteErrorMessage,
      revalidatePersonLists,
    ),
  updateSchema,
  update: (input, ctx) =>
    writeRecord(
      () => updateInterview(input.id, toPatch(input)),
      ctx,
      UPDATE_WRITE,
      { id: input.id },
      interviewWriteErrorMessage,
      revalidatePersonLists,
    ),
})
