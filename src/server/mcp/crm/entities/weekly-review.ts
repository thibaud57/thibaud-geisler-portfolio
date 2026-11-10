import "server-only"
import { z } from "zod"

import type { Prisma } from "@/generated/prisma/client"
import { matchesSearch, normalizeForSearch } from "@/lib/admin/search"
import { assertNever } from "@/lib/assert-never"
import { REVIEW_COUNTER_KEYS, weekLabel } from "@/lib/crm/weekly-reviews"
import { dateColumnIsoDay } from "@/lib/date-time"
import { weeklyReviewIdSchema } from "@/lib/ids"
import { recordFromKeys } from "@/lib/record-from-keys"
import { REVIEW_MOTIVATIONS, REVIEW_STATUSES } from "@/lib/schemas/weekly-review"
import {
  createWeeklyReview,
  revalidateReviewLists,
  updateWeeklyReview,
  type WeeklyReviewWriteError,
} from "@/server/crm/weekly-reviews"
import {
  findWeeklyReviewById,
  findWeeklyReviewSearchRows,
  findWeeklyReviewsPage,
} from "@/server/queries/weekly-reviews"

import { dateColumnDay, withDays } from "../day-fields"
import { dateRange } from "../date-range"
import { defineCrmEntity } from "../entity-definition"
import { notes, optionalText } from "../fields"
import { idOrderBy, pageQueryShape, type SortOrder } from "../query-page"
import { byId, notFoundMessage, writeRecord, writeTexts } from "../results"
import { updateSchemaWithoutDetailsOf } from "../update-input"

const entityField = z
  .literal("weekly-review")
  .describe('Type of CRM record: always "weekly-review" here.')

const reviewDay = (description?: string) => dateColumnDay({ example: "2026-10-30", description })

const isFriday = (day: Date): boolean => day.getUTCDay() === 5

const counter = (description: string) =>
  z.number().int().min(0).max(999).describe(`${description} Integer from 0 to 999.`)

// Les `.describe()` arrivent au modèle.
const fieldShape = {
  closingFriday: reviewDay(
    "Closing Friday of the reviewed week, YYYY-MM-DD. One review per Friday.",
  ).refine(isFriday, "closingFriday must be a Friday: the week runs from Saturday to this day."),
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
    closingFriday: dateRange(reviewDay())
      .optional()
      .describe("Only the reviews closing within this interval, days YYYY-MM-DD."),
  })
  .describe("Filters, combined with AND.")

// La dernière revue d'abord : c'est celle qu'un appelant relit pour décider de la suivante.
const querySchema = z.strictObject({
  entity: entityField,
  filters: reviewFilterSchema.optional(),
  ...pageQueryShape,
  order: pageQueryShape.order
    .unwrap()
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
const REVIEW_DAYS = ["closingFriday"] as const

function toWhere(filters: QueryInput["filters"]): Prisma.WeeklyReviewWhereInput {
  const range = filters?.closingFriday
  return { closingFriday: range && { gte: range.from, lte: range.to } }
}

// Une revue n'a pas de nom : « name » range par vendredi.
const nameOrder = (order: SortOrder): Prisma.WeeklyReviewOrderByWithRelationInput[] => [
  { closingFriday: order },
]

function weeklyReviewWriteErrorMessage(error: WeeklyReviewWriteError): string {
  switch (error.code) {
    case "review_week_exists":
      return "A review already exists for this closingFriday. Call crm_query with a closingFriday interval to find it, then crm_update it, or send another Friday."
    case "not_found":
      return notFoundMessage("weekly review")
    default:
      return assertNever(error)
  }
}

const WRITES = writeTexts(
  { key: "weekly_review", noun: "review" },
  "Call crm_query with a closingFriday interval to check whether it was created before retrying.",
)

export const weeklyReviewEntity = defineCrmEntity({
  entity: "weekly-review",
  docs: {
    search:
      'the week label ("S44 · 2026") and the closing Friday as YYYY-MM-DD for a weekly review (found by that label or that date)',
    fetch:
      "For a weekly review: its seven counters and its qualitative fields; closingFriday is a YYYY-MM-DD day.",
    queryRow:
      "for a weekly review id, closingFriday, the seven counters, status, motivation and updated date",
    querySort:
      "A weekly review has no name: sort name orders by closingFriday, and the default order is desc, so the first row is the last review, closingFriday as a YYYY-MM-DD day.",
    create:
      "For a weekly review, only closingFriday (a Friday, YYYY-MM-DD, unique: one review per week) is required: the seven counters left out are computed by the app for that week, never count them yourself, and a counter you send is kept. status (BONNE, MOYENNE, MAUVAISE), motivation (HAUTE, POSITIVE, NEUTRE, BASSE), wins, blockers, nextWeekPlan and notes are optional. No cadence check: to know the last review, call crm_query on weekly-review.",
    update:
      "For a weekly review, a counter left out stays unchanged and is never recomputed, and closingFriday must stay a Friday no other review holds.",
  },
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
  create: ({ data }, ctx) =>
    writeRecord({
      run: () => createWeeklyReview(data),
      ctx,
      texts: WRITES.create,
      logContext: {},
      errorMessage: weeklyReviewWriteErrorMessage,
      invalidate: revalidateReviewLists,
      ...byId,
    }),
  updateSchema,
  update: (input, ctx) =>
    writeRecord({
      run: () => updateWeeklyReview(input.id, input.fields ?? {}),
      ctx,
      texts: WRITES.update,
      logContext: { id: input.id },
      errorMessage: weeklyReviewWriteErrorMessage,
      invalidate: revalidateReviewLists,
      ...byId,
    }),
})
