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
import { zonedIsoInstant } from "@/lib/date-time"
import { interviewIdSchema, opportunityIdSchema, personIdSchema } from "@/lib/ids"
import {
  createInterview,
  updateInterview,
  type CorrespondentExists,
  type InterviewPatchWithoutNewCorrespondents,
  type InterviewWriteError,
} from "@/server/crm/interviews"
import { revalidatePersonLists } from "@/server/crm/person-guards"
import { defineEntity, joinHint } from "@/server/mcp/entity-definition"
import { idOrderBy, pageQueryShape, type SortOrder } from "@/server/mcp/query-page"
import { byId, notFoundMessage, writeRecord, writeTexts } from "@/server/mcp/results"
import { updateSchemaOf } from "@/server/mcp/update-input"
import {
  findInterviewByIdForAdmin,
  findInterviewSearchRows,
  findInterviewsPage,
} from "@/server/queries/interviews"

import { dateRange } from "../date-range"
import { instantDate } from "../day-fields"
import { details, detailsErrorMessage, notes } from "../fields"
import { personRef } from "../person-ref"

const entityField = z.literal("interview").describe('Type of CRM record: always "interview" here.')

const isoInstant = (description?: string) =>
  instantDate(
    "Expected an ISO 8601 date and time with its UTC offset, e.g. 2026-11-20T10:00:00+01:00.",
    description,
  )

// Les `.describe()` arrivent au modèle.
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
  scheduledAt: isoInstant(
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
    scheduledAt: dateRange(isoInstant())
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

function toWhere(filters: QueryInput["filters"]): Prisma.InterviewWhereInput {
  const range = filters?.scheduledAt
  return {
    status: filters?.status,
    type: filters?.type,
    side: filters?.side,
    opportunityId: filters?.opportunityId,
    scheduledAt: range && { gte: range.from, lte: range.to },
  }
}

// Un entretien n'a pas de nom : « name » range par opportunité puis par date.
const nameOrder = (order: SortOrder): Prisma.InterviewOrderByWithRelationInput[] => [
  { opportunity: { title: order } },
  { scheduledAt: order },
]

const toPatch = ({
  fields = {},
  detailsSection,
}: UpdateInput): InterviewPatchWithoutNewCorrespondents => ({ ...fields, detailsSection })

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
      return notFoundMessage("crm", "interview")
    case "no_details":
    case "section_not_found":
      return detailsErrorMessage(error, "interview")
    default:
      return assertNever(error)
  }
}

const WRITES = writeTexts(
  { prefix: "crm", key: "interview", noun: "interview" },
  "Call crm_query with the opportunityId filter to check whether it was created before retrying.",
)

export const interviewEntity = defineEntity({
  entity: "interview",
  docs: {
    search:
      'the label "Entretien N · type" (or "Premier contact" for a first contact) and "opportunity title · date and time in Paris" for an interview (found by that label or by its opportunity title)',
    fetch:
      "For an interview: its title, opportunity with intermediary and client, and correspondents (id and name, or id only when opted out).",
    queryRow:
      "for an interview id, title (Entretien N · type, or Premier contact), type, side, status, outcome, date, score and opportunity title",
    querySort: "An interview has no name: sort name orders by opportunity title then date.",
    create:
      "For an interview, opportunityId, side, type and scheduledAt (ISO 8601 with its offset) are required: side ESN needs an intermediary on the opportunity, correspondentIds must be existing persons who did not opt out (create a new one with crm_create first), and the Details get the template of its type unless you send your own.",
    update:
      "For an interview, correspondentIds replaces the whole list (omit it to keep it) and outcome is cleared unless the status is FAIT.",
  },
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
        hint: joinHint(interview.opportunity.title, zonedIsoInstant(interview.scheduledAt)),
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
    writeRecord({
      run: () =>
        createInterview({
          ...data,
          details: data.details === undefined ? interviewDetailsTemplate(data.type) : data.details,
        }),
      ctx,
      texts: WRITES.create,
      logContext: {},
      errorMessage: interviewWriteErrorMessage,
      invalidate: revalidatePersonLists,
      ...byId,
    }),
  updateSchema,
  update: (input, ctx) =>
    writeRecord({
      run: () => updateInterview(input.id, toPatch(input)),
      ctx,
      texts: WRITES.update,
      logContext: { id: input.id },
      errorMessage: interviewWriteErrorMessage,
      invalidate: revalidatePersonLists,
      ...byId,
    }),
})
