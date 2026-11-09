import "server-only"
import { z } from "zod"

import { ContractStatus, OpportunityStatus, WorkMode, Zone } from "@/generated/prisma/browser"
import type { Prisma } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { OPPORTUNITY_DETAILS_TEMPLATE } from "@/lib/crm/details-templates"
import { toMonthValue } from "@/lib/crm/opportunities"
import { companyIdSchema, opportunityIdSchema, personIdSchema } from "@/lib/ids"
import { mapDefined } from "@/lib/utils"
import {
  DURATION_MONTHS_MAX,
  POSTGRES_INT_MAX,
  ROLE_MAX_LENGTH,
  START_MONTH_PATTERN,
  startMonthToDate,
  TITLE_MAX_LENGTH,
} from "@/lib/schemas/opportunity"
import { revalidatePersonLists } from "@/server/crm/person-guards"
import {
  createOpportunity,
  updateOpportunity,
  type OpportunityPatch,
  type OpportunityWriteError,
} from "@/server/crm/opportunities"
import {
  findOpportunitiesPage,
  findOpportunityByIdForAdmin,
  findOpportunitySearchRows,
} from "@/server/queries/opportunities"

import { defineCrmEntity, joinHint } from "../entity-definition"
import { details, notes } from "../fields"
import { idOrderBy, pageQueryShape, type SortOrder } from "../query-page"
import { personRef } from "../person-ref"
import { writeRecord, type WriteTexts } from "../results"
import { updateSchemaOf } from "../update-input"

const entityField = z
  .literal("opportunity")
  .describe('Type of CRM record: always "opportunity" here.')

// Les `.describe()` arrivent au modèle. `null` efface un champ facultatif, un champ absent d'un patch reste inchangé.
const fieldShape = {
  title: z
    .string()
    .trim()
    .min(1)
    .max(TITLE_MAX_LENGTH)
    .describe(`Title of the opportunity, at most ${TITLE_MAX_LENGTH} characters.`),
  role: z
    .string()
    .trim()
    .min(1, "Pass null to clear the role.")
    .max(ROLE_MAX_LENGTH)
    .nullable()
    .describe(`Role offered, at most ${ROLE_MAX_LENGTH} characters. null clears it.`),
  status: z
    .enum(OpportunityStatus)
    .describe(
      "Status: PROPOSEE, EN_PROCESS, OFFRE_RECUE, EN_PAUSE, ACCEPTEE, REFUSEE, DECLINEE or ABANDONNEE.",
    ),
  referrerId: personIdSchema
    .nullable()
    .describe(
      "Id of the person who brought the opportunity, a lead or a contact. Get it from crm_search. null clears it.",
    ),
  intermediaryId: companyIdSchema
    .nullable()
    .describe(
      "Id of the intermediary company, which must have the type ESN_RECRUTEMENT. Get it from crm_search with the entity company. null for a direct client.",
    ),
  clientId: companyIdSchema
    .nullable()
    .describe(
      "Id of the end client company, different from the intermediary. Get it from crm_search with the entity company. null clears it.",
    ),
  dailyRate: z
    .number()
    .int()
    .min(1)
    .max(POSTGRES_INT_MAX)
    .nullable()
    .describe("Daily rate in euros, a positive integer. null clears it."),
  contract: z
    .enum(ContractStatus)
    .nullable()
    .describe("Contract status (e.g. FREELANCE). null clears it."),
  workMode: z.enum(WorkMode).nullable().describe("Work mode (e.g. HYBRIDE). null clears it."),
  daysPerWeek: z
    .number()
    .int()
    .min(1)
    .max(5)
    .nullable()
    .describe("Worked days per week, 1 to 5. null clears it."),
  onSiteDays: z
    .number()
    .int()
    .min(0)
    .max(5)
    .nullable()
    .describe("Days on site per week, 0 to 5, at most daysPerWeek. null clears it."),
  zone: z.enum(Zone).nullable().describe("Geographic zone of the work. null clears it."),
  startMonth: z
    .string()
    .trim()
    .regex(START_MONTH_PATTERN, "Expected a month as YYYY-MM (e.g. 2026-11).")
    .nullable()
    .describe("Start month, YYYY-MM (e.g. 2026-11). null clears it."),
  durationMonths: z
    .number()
    .int()
    .min(1)
    .max(DURATION_MONTHS_MAX)
    .nullable()
    .describe(`Duration in months, 1 to ${DURATION_MONTHS_MAX}. null clears it.`),
  notes: notes(),
  details,
} as const

const createDataSchema = z
  .strictObject({
    title: fieldShape.title,
    role: fieldShape.role.default(null),
    status: fieldShape.status.default("PROPOSEE"),
    referrerId: fieldShape.referrerId.default(null),
    intermediaryId: fieldShape.intermediaryId.default(null),
    clientId: fieldShape.clientId.default(null),
    dailyRate: fieldShape.dailyRate.default(null),
    contract: fieldShape.contract.default(null),
    workMode: fieldShape.workMode.default(null),
    daysPerWeek: fieldShape.daysPerWeek.default(null),
    onSiteDays: fieldShape.onSiteDays.default(null),
    zone: fieldShape.zone.default(null),
    startMonth: fieldShape.startMonth.default(null),
    durationMonths: fieldShape.durationMonths.default(null),
    notes: fieldShape.notes.default(null),
    details: fieldShape.details
      .optional()
      .describe(
        "Whole Details text in markdown. Omit it to get the standard section template (Contexte, Profil recherché, ...). null creates the opportunity without Details.",
      ),
  })
  .describe("Fields of the opportunity to create. Only title is required.")

const updateFieldsSchema = z
  .strictObject(fieldShape)
  .partial()
  .describe("Fields to change. A field left out stays unchanged, null clears an optional field.")

const opportunityFilterSchema = z
  .strictObject({
    status: z.enum(OpportunityStatus).optional().describe("Only this status."),
    clientId: companyIdSchema.optional().describe("Only the opportunities of this end client."),
    intermediaryId: companyIdSchema.optional().describe("Only the opportunities of this ESN."),
    referrerId: personIdSchema
      .optional()
      .describe("Only the opportunities brought by this person."),
    workMode: z.enum(WorkMode).optional().describe("Only this work mode."),
    zone: z.enum(Zone).optional().describe("Only this zone."),
  })
  .describe("Filters, combined with AND.")

const querySchema = z.strictObject({
  entity: entityField,
  filters: opportunityFilterSchema.optional(),
  ...pageQueryShape,
})

const createSchema = z.strictObject({ entity: entityField, data: createDataSchema })

const updateSchema = updateSchemaOf(
  entityField,
  opportunityIdSchema.describe("Id of the opportunity to update. Get it from crm_search first."),
  updateFieldsSchema,
)

type QueryInput = z.output<typeof querySchema>
type UpdateInput = z.output<typeof updateSchema>

function toWhere(filters: QueryInput["filters"]): Prisma.OpportunityWhereInput {
  return {
    status: filters?.status,
    clientId: filters?.clientId,
    intermediaryId: filters?.intermediaryId,
    referrerId: filters?.referrerId,
    workMode: filters?.workMode,
    zone: filters?.zone,
  }
}

// Le titre tient lieu de nom.
const nameOrder = (order: SortOrder): Prisma.OpportunityOrderByWithRelationInput[] => [
  { title: order },
]

// Le mois sort comme il entre : un instant relu puis réécrit serait refusé par le schéma d'entrée.
const withMonth = <T extends { startMonth: Date | null }>(row: T) => ({
  ...row,
  startMonth: row.startMonth && toMonthValue(row.startMonth),
})

const startMonthDate = (month: string | null): Date | null =>
  month === null ? null : startMonthToDate(month)

function toPatch({ fields = {}, detailsSection }: UpdateInput): OpportunityPatch {
  const { startMonth, ...rest } = fields
  return {
    ...rest,
    startMonth: mapDefined(startMonth, startMonthDate),
    detailsSection,
  }
}

const FIND_COMPANY = "Call crm_search with the entity company to find the right id"

// Chaque code devient un message qui nomme la correction : l'agent corrige l'appel sans deviner.
function opportunityWriteErrorMessage(error: OpportunityWriteError): string {
  switch (error.code) {
    case "intermediary_not_esn":
      return "The intermediary must be a company of type ESN_RECRUTEMENT. Pick an ESN with crm_search, or add that type to the company with crm_update, then call the tool again."
    case "referrer_not_found":
      return "No person has this referrerId. Call crm_search with the entity lead or contact to find the right id, then call the tool again."
    case "company_not_found":
      return `No company has this ${error.field}. ${FIND_COMPANY}, then call the tool again.`
    case "client_is_intermediary":
      return "The end client cannot be the intermediary: send two different companies, or null for one of them. On an update that sends only one of clientId and intermediaryId, the company already stored counts."
    case "days_out_of_range":
      return "onSiteDays cannot exceed daysPerWeek. Correct one of the two: on an update that sends only one of them, the value already stored counts."
    case "not_found":
      return "No opportunity has this id. Call crm_search to find the right id, then call the tool again."
    case "no_details":
      return "This opportunity has no Details text, so no section can be replaced. Write the whole text with fields.details instead."
    case "section_not_found":
      return `No section of the Details matches detailsSection.heading. Sections present: ${error.headings.join(", ")}. Use one of these titles.`
    default:
      return assertNever(error)
  }
}

// Un create n'a pas d'id à relire : le titre dit si l'opportunité existe déjà avant de réessayer.
const CREATE_WRITE: WriteTexts = {
  events: { success: "opportunity:created", failure: "opportunity:create_failed" },
  failureMessage:
    "The opportunity could not be saved because of an internal error. Call crm_search with its title to check whether it was created before retrying.",
}

const UPDATE_WRITE: WriteTexts = {
  events: { success: "opportunity:updated", failure: "opportunity:update_failed" },
  failureMessage:
    "The opportunity could not be saved because of an internal error. Call crm_fetch to check its current state before retrying.",
}

export const opportunityEntity = defineCrmEntity({
  entity: "opportunity",
  async search(query) {
    const needle = normalizeForSearch(query)
    const opportunities = await findOpportunitySearchRows()
    return opportunities
      .filter((opportunity) =>
        matchesSearch(
          needle,
          opportunity.title,
          opportunity.client?.name,
          opportunity.intermediary?.name,
        ),
      )
      .map((opportunity) => ({
        entity: "opportunity" as const,
        id: opportunity.id,
        label: opportunity.title,
        hint: joinHint(opportunity.client?.name, opportunity.status),
      }))
  },
  async fetch(id) {
    const opportunity = await findOpportunityByIdForAdmin(id)
    if (!opportunity) return null

    // L'apporteur opposé n'est connu que par son identifiant : ni email ni LinkedIn ne sortent d'un outil.
    const { referrer, ...record } = opportunity
    return { ...withMonth(record), referrer: referrer && personRef(referrer) }
  },
  querySchema,
  async query({ filters, sort, order, limit, offset }) {
    const { rows, total } = await findOpportunitiesPage({
      where: toWhere(filters),
      orderBy: idOrderBy(sort, order, nameOrder),
      take: limit,
      skip: offset,
    })
    return { rows: rows.map(withMonth), total }
  },
  createSchema,
  create: ({ data }, ctx) =>
    writeRecord(
      () =>
        createOpportunity({
          ...data,
          startMonth: startMonthDate(data.startMonth),
          details: data.details === undefined ? OPPORTUNITY_DETAILS_TEMPLATE : data.details,
        }),
      ctx,
      CREATE_WRITE,
      {},
      opportunityWriteErrorMessage,
      revalidatePersonLists,
    ),
  updateSchema,
  update: (input, ctx) =>
    writeRecord(
      () => updateOpportunity(input.id, toPatch(input)),
      ctx,
      UPDATE_WRITE,
      { id: input.id },
      opportunityWriteErrorMessage,
      revalidatePersonLists,
    ),
})
