import "server-only"
import { z } from "zod"

import type { Prisma } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { zonedDayStartOf, zonedIsoDay } from "@/lib/date-time"
import { personIdSchema, prospectingActionIdSchema } from "@/lib/ids"
import {
  ACTION_CHANNELS,
  ACTION_STATUSES,
  ACTION_TITLE_MAX_LENGTH,
} from "@/lib/schemas/prospecting-action"
import { revalidatePersonLists } from "@/server/crm/person-guards"
import {
  createProspectingAction,
  updateProspectingAction,
  type ProspectingActionWriteError,
} from "@/server/crm/prospecting-actions"
import { defineEntity, joinHint } from "@/server/mcp/entity-definition"
import { idOrderBy, pageQueryShape, type SortOrder } from "@/server/mcp/query-page"
import { byId, notFoundMessage, writeRecord, writeTexts } from "@/server/mcp/results"
import { updateSchemaWithoutDetailsOf } from "@/server/mcp/update-input"
import {
  findProspectingActionByIdForAdmin,
  findProspectingActionSearchRows,
  findProspectingActionsPage,
} from "@/server/queries/prospecting-actions"

import { dateRange } from "../date-range"
import { withDays, ZONED_DAY, zonedDay } from "../day-fields"
import { optionalText } from "../fields"
import { personRef } from "../person-ref"
import { conflictMessage } from "../person-write-tool"

const entityField = z
  .literal("prospecting-action")
  .describe('Type of CRM record: always "prospecting-action" here.')

// Colonnes Timestamptz : jours lus à Paris (voir `zonedDay`).
const actionDay = (description?: string) => zonedDay({ example: "2026-03-09", description })

// Les `.describe()` arrivent au modèle.
const fieldShape = {
  title: z
    .string()
    .trim()
    .min(1)
    .max(ACTION_TITLE_MAX_LENGTH)
    .describe(`Title of the action, at most ${ACTION_TITLE_MAX_LENGTH} characters.`),
  personId: personIdSchema.describe(
    "Id of the lead the action targets: a person with a lead record who did not opt out. Get it from crm_search with the entity lead.",
  ),
  channel: z
    .enum(ACTION_CHANNELS)
    .describe(
      "Channel: CANDIDATURE, CONNEXION_LINKEDIN, DM_LINKEDIN, EMAIL, SMS_WHATSAPP, CALL or AUTRE.",
    ),
  status: z
    .enum(ACTION_STATUSES)
    .describe(
      "Status: A_FAIRE, FAIT, REPONDU, CONVERTI or IGNORE. Changing it sets the dates by the status rules: leaving A_FAIRE takes the real sending time, REPONDU and CONVERTI set the reply date, any other status clears the reply and its date.",
    ),
  occurredAt: actionDay(
    "Day of the action, YYYY-MM-DD: the planned day while the status is A_FAIRE, the sending day after.",
  ),
  respondedAt: actionDay()
    .nullable()
    .describe(
      "Day the person replied, YYYY-MM-DD. Optional and used only with REPONDU or CONVERTI: left out or null, the status rules set it (or keep the stored one).",
    ),
  message: optionalText("Text of the message sent."),
  reply: optionalText(
    "Text of the reply received. Kept only with REPONDU or CONVERTI, cleared with any other status.",
  ),
} as const

const createDataSchema = z
  .strictObject({
    title: fieldShape.title,
    personId: fieldShape.personId,
    channel: fieldShape.channel,
    occurredAt: fieldShape.occurredAt,
    status: fieldShape.status.default("A_FAIRE"),
    respondedAt: fieldShape.respondedAt.optional(),
    message: fieldShape.message.default(null),
    reply: fieldShape.reply.default(null),
  })
  .describe("Fields of the action to create. Required: title, personId, channel and occurredAt.")

const updateFieldsSchema = z
  .strictObject(fieldShape)
  .partial()
  .describe("Fields to change. A field left out stays unchanged, null clears message or reply.")

const actionFilterSchema = z
  .strictObject({
    status: z.enum(ACTION_STATUSES).optional().describe("Only this status."),
    channel: z.enum(ACTION_CHANNELS).optional().describe("Only this channel."),
    personId: personIdSchema.optional().describe("Only the actions of this lead."),
    occurredAt: dateRange(actionDay())
      .optional()
      .describe("Only the actions dated within this interval, days YYYY-MM-DD."),
  })
  .describe("Filters, combined with AND.")

const querySchema = z.strictObject({
  entity: entityField,
  filters: actionFilterSchema.optional(),
  ...pageQueryShape,
})

const createSchema = z.strictObject({ entity: entityField, data: createDataSchema })

const updateSchema = updateSchemaWithoutDetailsOf(
  entityField,
  prospectingActionIdSchema.describe(
    "Id of the prospecting action to update. Get it from crm_search first.",
  ),
  updateFieldsSchema,
)

type QueryInput = z.output<typeof querySchema>

const ACTION_DAYS = ["occurredAt", "respondedAt"] as const

const withActionDays = <T extends { occurredAt: Date; respondedAt: Date | null }>(row: T) =>
  withDays(row, ACTION_DAYS, ZONED_DAY)

// La borne haute inclut son jour entier : une action envoyée à 14 h 30 ce jour-là reste dans l'intervalle.
const dayEnd = (dayStart: Date): Date => zonedDayStartOf(dayStart, 1)

function toWhere(filters: QueryInput["filters"]): Prisma.ProspectingActionWhereInput {
  const range = filters?.occurredAt
  return {
    status: filters?.status,
    channel: filters?.channel,
    personId: filters?.personId,
    occurredAt: range && {
      gte: range.from,
      lt: range.to === undefined ? undefined : dayEnd(range.to),
    },
  }
}

// Le titre tient lieu de nom.
const nameOrder = (order: SortOrder): Prisma.ProspectingActionOrderByWithRelationInput[] => [
  { title: order },
]

function prospectingActionWriteErrorMessage(error: ProspectingActionWriteError): string {
  switch (error.code) {
    case "person_conflict":
      return conflictMessage(error.conflict)
    case "person_not_found":
      return "No person has this personId. Call crm_search with the entity lead to find the right id, then call the tool again."
    case "not_found":
      return notFoundMessage("crm", "prospecting action")
    default:
      return assertNever(error)
  }
}

const WRITES = writeTexts(
  { prefix: "crm", key: "prospecting_action", noun: "action" },
  "Call crm_query with the personId filter to check whether it was created before retrying.",
)

export const prospectingActionEntity = defineEntity({
  entity: "prospecting-action",
  docs: {
    search:
      '"lead · date · status" for a prospecting action (found by its title or by the name of its lead)',
    fetch:
      "For a prospecting action: its fields and its lead (id and name, or id only when opted out); its day fields occurredAt and respondedAt are YYYY-MM-DD days, the format crm_create and crm_update take.",
    queryRow:
      "for a prospecting action id, title, channel, status, date, reply date and lead as id and name, or id only when opted out",
    querySort:
      "A prospecting action is sorted by its title, and its day fields come as YYYY-MM-DD.",
    create:
      "For a prospecting action, personId (a lead who did not opt out and holds a lead record), title, channel and occurredAt (a day, YYYY-MM-DD) are required: the status starts at A_FAIRE and the dates follow the status rules.",
    update:
      "For a prospecting action, a status change applies the status rules: leaving A_FAIRE takes the real sending time unless occurredAt moves to another day in the same patch, REPONDU and CONVERTI keep the respondedAt sent with them (else the stored one, else today), any other status clears the reply and its date. The lead must not have opted out.",
  },
  async search(query) {
    const needle = normalizeForSearch(query)
    const actions = await findProspectingActionSearchRows()
    // Le titre est un texte libre qui peut porter les coordonnées du lead opposé : une de ses actions ne se retrouve par aucun mot.
    return actions
      .map(({ person, ...action }) => ({ action, lead: personRef(person) }))
      .filter(
        ({ action, lead }) => !lead.optedOut && matchesSearch(needle, action.title, lead.name),
      )
      .map(({ action, lead }) => ({
        entity: "prospecting-action" as const,
        id: action.id,
        label: action.title,
        hint: joinHint(lead.name, zonedIsoDay(action.occurredAt), action.status),
      }))
  },
  async fetch(id) {
    const action = await findProspectingActionByIdForAdmin(id)
    if (!action) return null

    // Le lead opposé n'est connu que par son identifiant, et ses mots (titre, message, réponse) peuvent porter ses coordonnées : rien de lui ne sort d'un outil.
    const { person, title, message, reply, ...record } = action
    const lead = personRef(person)
    return {
      ...withActionDays(record),
      ...(lead.optedOut ? {} : { title, message, reply }),
      lead,
    }
  },
  querySchema,
  async query({ filters, sort, order, limit, offset }) {
    const { rows, total } = await findProspectingActionsPage({
      where: toWhere(filters),
      orderBy: idOrderBy(sort, order, nameOrder),
      take: limit,
      skip: offset,
    })
    return {
      rows: rows.map(({ person, title, ...row }) => {
        const lead = personRef(person)
        return { ...withActionDays(row), ...(lead.optedOut ? {} : { title }), lead }
      }),
      total,
    }
  },
  createSchema,
  create: ({ data }, ctx) =>
    writeRecord({
      run: () => createProspectingAction(data),
      ctx,
      texts: WRITES.create,
      logContext: {},
      errorMessage: prospectingActionWriteErrorMessage,
      invalidate: revalidatePersonLists,
      ...byId,
    }),
  updateSchema,
  update: (input, ctx) =>
    writeRecord({
      run: () => updateProspectingAction(input.id, input.fields ?? {}),
      ctx,
      texts: WRITES.update,
      logContext: { id: input.id },
      errorMessage: prospectingActionWriteErrorMessage,
      invalidate: revalidatePersonLists,
      ...byId,
    }),
})
