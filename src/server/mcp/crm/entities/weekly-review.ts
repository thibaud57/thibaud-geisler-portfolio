import "server-only"
import { z } from "zod"

import type { Prisma } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { isFridayIso, REVIEW_COUNTER_KEYS, weekLabel } from "@/lib/crm/weekly-reviews"
import { dateColumnIsoDay, isoDayToDate } from "@/lib/date-time"
import { weeklyReviewIdSchema } from "@/lib/ids"
import { recordFromKeys } from "@/lib/record-from-keys"
import { REVIEW_MOTIVATIONS, REVIEW_STATUSES } from "@/lib/schemas/weekly-review"
import {
  createWeeklyReview,
  revalidateReviewLists,
  updateWeeklyReview,
  type WeeklyReviewPatch,
  type WeeklyReviewWriteError,
} from "@/server/crm/weekly-reviews"
import {
  findWeeklyReviewById,
  findWeeklyReviewSearchRows,
  findWeeklyReviewsPage,
} from "@/server/queries/weekly-reviews"

import { toDay, withDays } from "../day-fields"
import { dateRange } from "../date-range"
import { defineCrmEntity } from "../entity-definition"
import { notes, optionalText } from "../fields"
import { idOrderBy, pageQueryShape, type SortOrder } from "../query-page"
import { writeRecord, type WriteTexts } from "../results"
import { updateSchemaWithoutDetailsOf } from "../update-input"

const entityField = z
  .literal("weekly-review")
  .describe('Type of CRM record: always "weekly-review" here.')

// `abort` : sans lui, `isFridayIso` lirait aussi un jour mal formé, que `isoDayToDate` refuse en levant.
const reviewDay = z.iso.date({
  error: "Expected a day as YYYY-MM-DD, e.g. 2026-10-30.",
  abort: true,
})

const counter = (description: string) =>
  z.number().int().min(0).max(999).describe(`${description} Integer from 0 to 999.`)

// Les `.describe()` arrivent au modèle. `null` efface un champ facultatif, un champ absent d'un patch reste inchangé.
const fieldShape = {
  closingFriday: reviewDay
    .refine(isFridayIso, "closingFriday must be a Friday: the week runs from Saturday to this day.")
    .describe("Closing Friday of the reviewed week, YYYY-MM-DD. One review per Friday."),
  connectionsSent: counter("LinkedIn connection requests sent in the week."),
  connectionsAccepted: counter("Connection requests accepted in the week."),
  messagesSent: counter("Messages sent in the week."),
  conversationsEngaged: counter("Conversations engaged in the week."),
  meetingsBooked: counter("Meetings booked in the week."),
  interviewsHeld: counter("Interviews held in the week."),
  activeLeads: counter("Leads active when the review is created."),
  status: z
    .enum(REVIEW_STATUSES)
    .nullable()
    .describe(`Overall status of the week: ${REVIEW_STATUSES.join(", ")}. null clears it.`),
  motivation: z
    .enum(REVIEW_MOTIVATIONS)
    .nullable()
    .describe(`Motivation level: ${REVIEW_MOTIVATIONS.join(", ")}. null clears it.`),
  wins: optionalText("What went well."),
  blockers: optionalText("What got in the way."),
  nextWeekPlan: optionalText("Plan for the next week."),
  notes: notes("Pass null to clear this field.", "it"),
} as const

const createDataSchema = z
  .strictObject({
    closingFriday: fieldShape.closingFriday,
    ...recordFromKeys(REVIEW_COUNTER_KEYS, (key) => fieldShape[key].optional()),
    status: fieldShape.status.default(null),
    motivation: fieldShape.motivation.default(null),
    wins: fieldShape.wins.default(null),
    blockers: fieldShape.blockers.default(null),
    nextWeekPlan: fieldShape.nextWeekPlan.default(null),
    notes: fieldShape.notes.default(null),
  })
  .describe(
    "Fields of the review to create. Required: closingFriday. A counter left out is computed by the app for that week: never count it yourself.",
  )

const updateFieldsSchema = z
  .strictObject(fieldShape)
  .partial()
  .describe(
    "Fields to change. A field left out stays unchanged, counters included: they are never recomputed. null clears an optional field.",
  )

const reviewFilterSchema = z
  .strictObject({
    closingFriday: dateRange(reviewDay)
      .optional()
      .describe("Only the reviews closing within this interval, days YYYY-MM-DD."),
  })
  .describe("Filters, combined with AND.")

// La dernière revue d'abord : c'est celle qu'un appelant relit pour décider de la suivante.
const querySchema = z.strictObject({
  entity: entityField,
  filters: reviewFilterSchema.optional(),
  ...pageQueryShape,
  order: z
    .enum(["asc", "desc"])
    .default("desc")
    .describe("Sort direction. Defaults to desc: the latest week first."),
})

const createSchema = z.strictObject({ entity: entityField, data: createDataSchema })

const updateSchema = updateSchemaWithoutDetailsOf(
  entityField,
  weeklyReviewIdSchema.describe("Id of the weekly review to update. Get it from crm_search first."),
  updateFieldsSchema,
)

type QueryInput = z.output<typeof querySchema>
type UpdateInput = z.output<typeof updateSchema>

const REVIEW_DAYS = ["closingFriday"] as const

function toWhere(filters: QueryInput["filters"]): Prisma.WeeklyReviewWhereInput {
  const range = filters?.closingFriday
  return { closingFriday: range && { gte: toDay(range.from), lte: toDay(range.to) } }
}

// Une revue n'a pas de nom : « name » range par vendredi.
const nameOrder = (order: SortOrder): Prisma.WeeklyReviewOrderByWithRelationInput[] => [
  { closingFriday: order },
]

function toPatch({ fields = {} }: UpdateInput): WeeklyReviewPatch {
  const { closingFriday, ...rest } = fields
  return { ...rest, closingFriday: toDay(closingFriday) }
}

// Chaque code devient un message qui nomme la correction : l'agent corrige l'appel sans deviner.
function weeklyReviewWriteErrorMessage(error: WeeklyReviewWriteError): string {
  switch (error.code) {
    case "review_week_exists":
      return "A review already exists for this closingFriday. Call crm_query with a closingFriday interval to find it, then crm_update it, or send another Friday."
    case "not_found":
      return "No weekly review has this id. Call crm_search to find the right id, then call the tool again."
    default:
      return assertNever(error)
  }
}

// Un create n'a pas d'id à relire : la liste des revues dit si celle-ci existe déjà avant de réessayer.
const CREATE_WRITE: WriteTexts = {
  events: { success: "weekly_review:created", failure: "weekly_review:create_failed" },
  failureMessage:
    "The review could not be saved because of an internal error. Call crm_query with a closingFriday interval to check whether it was created before retrying.",
}

const UPDATE_WRITE: WriteTexts = {
  events: { success: "weekly_review:updated", failure: "weekly_review:update_failed" },
  failureMessage:
    "The review could not be saved because of an internal error. Call crm_fetch to check its current state before retrying.",
}

export const weeklyReviewEntity = defineCrmEntity({
  entity: "weekly-review",
  async search(query) {
    const needle = normalizeForSearch(query)
    const reviews = await findWeeklyReviewSearchRows()
    return reviews
      .map(({ id, closingFriday }) => ({
        entity: "weekly-review" as const,
        id,
        label: weekLabel(closingFriday),
        hint: dateColumnIsoDay(closingFriday),
      }))
      .filter(({ label, hint }) => matchesSearch(needle, label, hint))
  },
  async fetch(id) {
    const review = await findWeeklyReviewById(id)
    return review && withDays(review, REVIEW_DAYS)
  },
  querySchema,
  async query({ filters, sort, order, limit, offset }) {
    const { rows, total } = await findWeeklyReviewsPage({
      where: toWhere(filters),
      orderBy: idOrderBy(sort, order, nameOrder),
      take: limit,
      skip: offset,
    })
    return { rows: rows.map((row) => withDays(row, REVIEW_DAYS)), total }
  },
  createSchema,
  create: ({ data: { closingFriday, ...fields } }, ctx) =>
    writeRecord(
      () => createWeeklyReview({ ...fields, closingFriday: isoDayToDate(closingFriday) }),
      ctx,
      CREATE_WRITE,
      {},
      weeklyReviewWriteErrorMessage,
      revalidateReviewLists,
    ),
  updateSchema,
  update: (input, ctx) =>
    writeRecord(
      () => updateWeeklyReview(input.id, toPatch(input)),
      ctx,
      UPDATE_WRITE,
      { id: input.id },
      weeklyReviewWriteErrorMessage,
      revalidateReviewLists,
    ),
})
