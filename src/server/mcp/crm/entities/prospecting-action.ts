import "server-only"
import { z } from "zod"

import type { Prisma } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { zonedDayStart, zonedIsoDay } from "@/lib/date-time"
import { personIdSchema, prospectingActionIdSchema } from "@/lib/ids"
import {
  ACTION_CHANNELS,
  ACTION_STATUSES,
  ACTION_TITLE_MAX_LENGTH,
  actionDayStart,
} from "@/lib/schemas/prospecting-action"
import { revalidatePersonLists } from "@/server/crm/person-guards"
import {
  createProspectingAction,
  updateProspectingAction,
  type ProspectingActionPatch,
  type ProspectingActionWriteError,
} from "@/server/crm/prospecting-actions"
import {
  findProspectingActionByIdForAdmin,
  findProspectingActionSearchRows,
  findProspectingActionsPage,
} from "@/server/queries/prospecting-actions"

import { dateRange } from "../date-range"
import { toDay, withDays } from "../day-fields"
import { defineCrmEntity, joinHint } from "../entity-definition"
import { optionalText } from "../fields"
import { personRef } from "../person-ref"
import { conflictMessage } from "../person-write-tool"
import { idOrderBy, pageQueryShape, type SortOrder } from "../query-page"
import { writeRecord, type WriteTexts } from "../results"
import { updateSchemaWithoutDetailsOf } from "../update-input"

const entityField = z
  .literal("prospecting-action")
  .describe('Type of CRM record: always "prospecting-action" here.')

const actionDay = z.iso.date({ error: "Expected a day as YYYY-MM-DD, e.g. 2026-03-09." })

// Les `.describe()` arrivent au modèle. `null` efface un champ facultatif, un champ absent d'un patch reste inchangé.
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
  occurredAt: actionDay.describe(
    "Day of the action, YYYY-MM-DD: the planned day while the status is A_FAIRE, the sending day after.",
  ),
  respondedAt: actionDay.describe(
    "Day the person replied, YYYY-MM-DD. Optional and used only with REPONDU or CONVERTI: left out, the status rules set it (or keep the stored one).",
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
    occurredAt: dateRange(actionDay)
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
type UpdateInput = z.output<typeof updateSchema>

// Colonnes Timestamptz : les jours entrent en minuit de Paris et sortent en jour de Paris, un instant UTC relu puis réécrit décalerait l'action d'un jour.
const ACTION_DAYS = ["occurredAt", "respondedAt"] as const

const toActionDay = (day: string | undefined): Date | undefined => toDay(day, actionDayStart)

const withActionDays = <T extends { occurredAt: Date; respondedAt: Date | null }>(row: T) =>
  withDays(row, ACTION_DAYS, zonedIsoDay)

// La borne haute inclut son jour entier : une action envoyée à 14 h 30 ce jour-là reste dans l'intervalle.
const dayEnd = (day: string): Date => zonedDayStart(new Date(day), 1)

function toWhere(filters: QueryInput["filters"]): Prisma.ProspectingActionWhereInput {
  const range = filters?.occurredAt
  return {
    status: filters?.status,
    channel: filters?.channel,
    personId: filters?.personId,
    occurredAt: range && {
      gte: toActionDay(range.from),
      lt: range.to === undefined ? undefined : dayEnd(range.to),
    },
  }
}

// Le titre tient lieu de nom.
const nameOrder = (order: SortOrder): Prisma.ProspectingActionOrderByWithRelationInput[] => [
  { title: order },
]

function toPatch({ fields = {} }: UpdateInput): ProspectingActionPatch {
  const { occurredAt, respondedAt, ...rest } = fields
  return { ...rest, occurredAt: toActionDay(occurredAt), respondedAt: toActionDay(respondedAt) }
}

// Chaque code devient un message qui nomme la correction : l'agent corrige l'appel sans deviner.
function prospectingActionWriteErrorMessage(error: ProspectingActionWriteError): string {
  switch (error.code) {
    case "person_conflict":
      return conflictMessage(error.conflict)
    case "person_not_found":
      return "No person has this personId. Call crm_search with the entity lead to find the right id, then call the tool again."
    case "not_found":
      return "No prospecting action has this id. Call crm_search to find the right id, then call the tool again."
    default:
      return assertNever(error)
  }
}

// Un create n'a pas d'id à relire : les actions du lead disent si celle-ci existe déjà avant de réessayer.
const CREATE_WRITE: WriteTexts = {
  events: { success: "prospecting_action:created", failure: "prospecting_action:create_failed" },
  failureMessage:
    "The action could not be saved because of an internal error. Call crm_query with the personId filter to check whether it was created before retrying.",
}

const UPDATE_WRITE: WriteTexts = {
  events: { success: "prospecting_action:updated", failure: "prospecting_action:update_failed" },
  failureMessage:
    "The action could not be saved because of an internal error. Call crm_fetch to check its current state before retrying.",
}

export const prospectingActionEntity = defineCrmEntity({
  entity: "prospecting-action",
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
    writeRecord(
      () =>
        createProspectingAction({
          ...data,
          occurredAt: actionDayStart(data.occurredAt),
          respondedAt: toActionDay(data.respondedAt),
        }),
      ctx,
      CREATE_WRITE,
      {},
      prospectingActionWriteErrorMessage,
      revalidatePersonLists,
    ),
  updateSchema,
  update: (input, ctx) =>
    writeRecord(
      () => updateProspectingAction(input.id, toPatch(input)),
      ctx,
      UPDATE_WRITE,
      { id: input.id },
      prospectingActionWriteErrorMessage,
      revalidatePersonLists,
    ),
})
