import "server-only"
import { z } from "zod"

import { SignalType } from "@/generated/prisma/browser"
import type { Prisma } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { COMPANY_SIGNAL_TYPES, LEAD_SIGNAL_TYPES, SIGNAL_TYPE_LABELS } from "@/lib/crm/signals"
import { dateColumnIsoDay } from "@/lib/date-time"
import {
  companyIdSchema,
  personIdSchema,
  signalIdSchema,
  type CompanyId,
  type PersonId,
} from "@/lib/ids"
import { isValidWebsiteUrl } from "@/lib/schemas/company"
import { SIGNAL_CONTENT_MAX_LENGTH, SIGNAL_SOURCE_URL_MAX_LENGTH } from "@/lib/schemas/signal"
import {
  createSignal,
  revalidateSignalLists,
  updateSignal,
  type SignalOwnerRef,
  type SignalWriteError,
} from "@/server/crm/signals"
import {
  findSignalById,
  findSignalSearchRows,
  findSignalsPage,
  type SignalTargets,
} from "@/server/queries/signals"

import { dateColumnDay, withDays } from "../day-fields"
import { dateRange } from "../date-range"
import { defineCrmEntity, joinHint } from "../entity-definition"
import { personRef } from "../person-ref"
import { idOrderBy, pageQueryShape, type SortOrder } from "../query-page"
import { byId, notFoundMessage, writeRecord, writeTexts } from "../results"
import { updateSchemaWithoutDetailsOf } from "../update-input"

const entityField = z.literal("signal").describe('Type of CRM record: always "signal" here.')

const signalDay = (description?: string) => dateColumnDay({ example: "2026-09-14", description })

// Les `.describe()` arrivent au modèle.
const fieldShape = {
  type: z
    .enum(SignalType)
    .describe(
      `Type, which must fit the target. Company: ${COMPANY_SIGNAL_TYPES.join(", ")}. Lead: ${LEAD_SIGNAL_TYPES.join(", ")}.`,
    ),
  occurredOn: signalDay(
    "Day of the signal, YYYY-MM-DD: the day when the source gives it, the 1st of the month otherwise.",
  ),
  content: z
    .string()
    .trim()
    .min(1)
    .max(SIGNAL_CONTENT_MAX_LENGTH)
    .describe(`What the signal says, at most ${SIGNAL_CONTENT_MAX_LENGTH} characters.`),
  sourceUrl: z
    .string()
    .trim()
    .min(1, "Pass null to clear the link.")
    .max(SIGNAL_SOURCE_URL_MAX_LENGTH)
    .refine(isValidWebsiteUrl, "Expected a web address starting with http:// or https://.")
    .nullable()
    .describe(
      `Link to the source, at most ${SIGNAL_SOURCE_URL_MAX_LENGTH} characters. null clears it.`,
    ),
} as const

// Le rattachement ne s'écrit qu'à la création : `companyId` et `personId` sont absents du patch, que le schéma strict refuse s'il les nomme.
const createDataSchema = z
  .strictObject({
    companyId: companyIdSchema
      .optional()
      .describe("Id of the company the signal is about. Send this or personId, never both."),
    personId: personIdSchema
      .optional()
      .describe(
        "Id of the lead the signal is about: an OUTBOUND lead who did not opt out. Send this or companyId, never both.",
      ),
    type: fieldShape.type,
    occurredOn: fieldShape.occurredOn,
    content: fieldShape.content,
    sourceUrl: fieldShape.sourceUrl.default(null),
  })
  .refine(({ companyId, personId }) => (companyId === undefined) !== (personId === undefined), {
    error:
      "Send exactly one of companyId or personId: companyId for a signal about a company, personId for a signal about a lead.",
  })
  .describe(
    "Fields of the signal to create. Required: exactly one of companyId or personId, type, occurredOn and content.",
  )

const updateFieldsSchema = z
  .strictObject(fieldShape)
  .partial()
  .describe(
    "Fields to change. A field left out stays unchanged, null clears sourceUrl. The target (company or lead) never changes.",
  )

const signalFilterSchema = z
  .strictObject({
    companyId: companyIdSchema.optional().describe("Only the signals of this company."),
    personId: personIdSchema.optional().describe("Only the signals of this lead."),
    type: z.enum(SignalType).optional().describe("Only this type."),
    occurredOn: dateRange(signalDay())
      .optional()
      .describe("Only the signals dated within this interval, days YYYY-MM-DD."),
  })
  .describe("Filters, combined with AND.")

const querySchema = z.strictObject({
  entity: entityField,
  filters: signalFilterSchema.optional(),
  ...pageQueryShape,
})

const createSchema = z.strictObject({ entity: entityField, data: createDataSchema })

const updateSchema = updateSchemaWithoutDetailsOf(
  entityField,
  signalIdSchema.describe("Id of the signal to update. Get it from crm_search first."),
  updateFieldsSchema,
)

type QueryInput = z.output<typeof querySchema>

// Le lead opposé n'est connu que par son identifiant : ni email ni LinkedIn ne sortent d'un outil.
const withTarget = <T extends SignalTargets & { occurredOn: Date }>({
  company,
  person,
  ...row
}: T) => ({ ...withDays(row, ["occurredOn"]), company, lead: person && personRef(person) })

function toWhere(filters: QueryInput["filters"]): Prisma.SignalWhereInput {
  const range = filters?.occurredOn
  return {
    companyId: filters?.companyId,
    personId: filters?.personId,
    type: filters?.type,
    occurredOn: range && { gte: range.from, lte: range.to },
  }
}

// Un signal n'a pas de nom : « name » range par date.
const nameOrder = (order: SortOrder): Prisma.SignalOrderByWithRelationInput[] => [
  { occurredOn: order },
]

// Le schéma garantit exactement un rattachement : sans l'un ni l'autre, la validation a été contournée.
function ownerOf({
  companyId,
  personId,
}: {
  companyId?: CompanyId
  personId?: PersonId
}): SignalOwnerRef {
  if (companyId !== undefined) return { companyId }
  if (personId !== undefined) return { personId }
  throw new Error("A signal needs a companyId or a personId")
}

function signalWriteErrorMessage(error: SignalWriteError): string {
  switch (error.code) {
    case "type_mismatch":
      return `This type does not fit the target. A company takes ${COMPANY_SIGNAL_TYPES.join(", ")}; a lead takes ${LEAD_SIGNAL_TYPES.join(", ")}. Send a type of the right group, then call the tool again.`
    case "lead_not_eligible":
      return "A signal can only be attached to a lead with origin OUTBOUND who did not opt out of prospecting. Call crm_search with the entity lead to check the person, or attach the signal to its company with companyId."
    case "company_not_found":
      return "No company has this companyId. Call crm_search with the entity company to find the right id, then call the tool again."
    case "not_found":
      return notFoundMessage("signal")
    default:
      return assertNever(error)
  }
}

const WRITES = writeTexts(
  { key: "signal", noun: "signal" },
  "Call crm_query with the companyId or personId filter to check whether it was created before retrying.",
)

export const signalEntity = defineCrmEntity({
  entity: "signal",
  docs: {
    search: 'the type label and "company or lead · date" for a signal (found by its content)',
    fetch:
      "For a signal: its fields and its company or its lead (id and name, or id only when opted out); occurredOn is a YYYY-MM-DD day.",
    queryRow:
      "for a signal id, type, day occurredOn, content, link, and its company or lead as id and name",
    querySort: "A signal has no name: sort name orders by day.",
    create:
      "For a signal, exactly one of companyId or personId, type, occurredOn (a day, YYYY-MM-DD) and content are required: the type must fit the target (company: OFFRE_POSTE, LEVEE, EXPANSION, NOUVEAU_PRODUIT, PIVOT, ACQUISITION; lead: POST, COMMENTAIRE, CONFERENCE, INTERACTION) and a lead must be OUTBOUND and not opted out.",
    update: "For a signal, the target never changes and the type must keep fitting it.",
  },
  async search(query) {
    const needle = normalizeForSearch(query)
    const signals = await findSignalSearchRows()
    return signals
      .filter(({ content }) => matchesSearch(needle, content))
      .map(({ company, person, ...signal }) => {
        const target = company?.name ?? (person && personRef(person).name)
        return {
          entity: "signal" as const,
          id: signal.id,
          label: SIGNAL_TYPE_LABELS[signal.type],
          hint: joinHint(target, dateColumnIsoDay(signal.occurredOn)),
        }
      })
  },
  async fetch(id) {
    const signal = await findSignalById(id)
    return signal && withTarget(signal)
  },
  querySchema,
  async query({ filters, sort, order, limit, offset }) {
    const { rows, total } = await findSignalsPage({
      where: toWhere(filters),
      orderBy: idOrderBy(sort, order, nameOrder),
      take: limit,
      skip: offset,
    })
    return { rows: rows.map(withTarget), total }
  },
  createSchema,
  create: ({ data: { companyId, personId, ...fields } }, ctx) =>
    writeRecord({
      run: () => createSignal(ownerOf({ companyId, personId }), fields),
      ctx,
      texts: WRITES.create,
      logContext: {},
      errorMessage: signalWriteErrorMessage,
      invalidate: revalidateSignalLists,
      ...byId,
    }),
  updateSchema,
  update: (input, ctx) =>
    writeRecord({
      run: () => updateSignal(input.id, input.fields ?? {}),
      ctx,
      texts: WRITES.update,
      logContext: { id: input.id },
      errorMessage: signalWriteErrorMessage,
      invalidate: revalidateSignalLists,
      ...byId,
    }),
})
