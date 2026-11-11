import "server-only"
import { z } from "zod"

import { ContractStatus, OpportunityStatus, WorkMode, Zone } from "@/generated/prisma/browser"
import type { Prisma } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { OPPORTUNITY_DETAILS_TEMPLATE } from "@/lib/crm/details-templates"
import { companyIdSchema, opportunityIdSchema, personIdSchema } from "@/lib/ids"
import {
  DURATION_MONTHS_MAX,
  POSTGRES_INT_MAX,
  ROLE_MAX_LENGTH,
  START_MONTH_PATTERN,
  startMonthToDate,
  TITLE_MAX_LENGTH,
} from "@/lib/schemas/opportunity"
import { mapDefined } from "@/lib/utils"
import {
  createOpportunity,
  updateOpportunity,
  type OpportunityPatch,
  type OpportunityWriteError,
} from "@/server/crm/opportunities"
import { revalidatePersonLists } from "@/server/crm/person-guards"
import { defineEntity, joinHint } from "@/server/mcp/entity-definition"
import { idOrderBy, pageQueryShape, type SortOrder } from "@/server/mcp/query-page"
import { byId, notFoundMessage, writeRecord, writeTexts } from "@/server/mcp/results"
import { updateSchemaOf } from "@/server/mcp/update-input"
import {
  findOpportunitiesPage,
  findOpportunityByIdForAdmin,
  findOpportunitySearchRows,
} from "@/server/queries/opportunities"

import { withMonth } from "../day-fields"
import { details, detailsErrorMessage, notes } from "../fields"
import { personRef } from "../person-ref"

const entityField = z
  .literal("opportunity")
  .describe('Type of CRM record: always "opportunity" here.')

// Les `.describe()` arrivent au modèle.
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
      "Id of the person who brought the opportunity, a lead or a contact who did not opt out. Get it from crm_search. null clears it.",
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

function opportunityWriteErrorMessage(error: OpportunityWriteError): string {
  switch (error.code) {
    case "intermediary_not_esn":
      return "The intermediary must be a company of type ESN_RECRUTEMENT. Pick an ESN with crm_search, or add that type to the company with crm_update, then call the tool again."
    case "referrer_not_found":
      return "No person who did not opt out of prospecting has this referrerId. Call crm_search with the entity lead or contact to find the right id, then call the tool again."
    case "company_not_found":
      return `No company has this ${error.field}. ${FIND_COMPANY}, then call the tool again.`
    case "client_is_intermediary":
      return "The end client cannot be the intermediary: send two different companies, or null for one of them. On an update that sends only one of clientId and intermediaryId, the company already stored counts."
    case "days_out_of_range":
      return "onSiteDays cannot exceed daysPerWeek. Correct one of the two: on an update that sends only one of them, the value already stored counts."
    case "not_found":
      return notFoundMessage("crm", "opportunity")
    case "no_details":
    case "section_not_found":
      return detailsErrorMessage(error, "opportunity")
    default:
      return assertNever(error)
  }
}

const WRITES = writeTexts(
  { prefix: "crm", key: "opportunity", noun: "opportunity" },
  "Call crm_search with its title to check whether it was created before retrying.",
)

export const opportunityEntity = defineEntity({
  entity: "opportunity",
  docs: {
    search:
      '"client · status" for an opportunity (found by title or by the name of its client or intermediary)',
    fetch:
      "For an opportunity: its referrer (id and name, or id only when they opted out), intermediary, client and interviews.",
    queryRow:
      "for an opportunity id, title, status, daily rate, start month, client and intermediary",
    create:
      "For an opportunity, only title is required: the referrer must not have opted out, the intermediary must be a company of type ESN_RECRUTEMENT, the client must differ from the intermediary, onSiteDays cannot exceed daysPerWeek, and the Details get the standard template unless you send your own.",
    update:
      "The same rules as at creation apply to an opportunity, checked against its stored values when you send one field only.",
  },
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
    writeRecord({
      run: () =>
        createOpportunity({
          ...data,
          startMonth: startMonthDate(data.startMonth),
          details: data.details === undefined ? OPPORTUNITY_DETAILS_TEMPLATE : data.details,
        }),
      ctx,
      texts: WRITES.create,
      logContext: {},
      errorMessage: opportunityWriteErrorMessage,
      invalidate: revalidatePersonLists,
      ...byId,
    }),
  updateSchema,
  update: (input, ctx) =>
    writeRecord({
      run: () => updateOpportunity(input.id, toPatch(input)),
      ctx,
      texts: WRITES.update,
      logContext: { id: input.id },
      errorMessage: opportunityWriteErrorMessage,
      invalidate: revalidatePersonLists,
      ...byId,
    }),
})
