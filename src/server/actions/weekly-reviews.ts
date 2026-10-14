"use server"

import "server-only"
import { revalidatePath } from "next/cache"

import { ADMIN_WEEKLY_REVIEWS_PATH } from "@/lib/admin/routes"
import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { countWeek, weekBounds } from "@/lib/crm/review-counters"
import { weeklyReviewSchema, type WeeklyReviewInput } from "@/lib/schemas/weekly-review"
import { createActionLogger, isPrismaError, stringField } from "@/lib/server-utils"
import {
  isFridayIso,
  isoDayToDate,
  REVIEW_COUNTER_KEYS,
  type ReviewCounts,
} from "@/lib/crm/weekly-reviews"
import { findWeekCounterSources } from "@/server/queries/weekly-reviews"

import {
  type ActionEvents,
  deleteEntity,
  formStateHandlers,
  rowExists,
  saveEntity,
} from "./_support/shared"
import type { WeeklyReviewFormState } from "./weekly-reviews.types"

const WEEK_TAKEN = "Une revue existe déjà pour cette semaine"

function collectValues(formData: FormData): WeeklyReviewFormState["values"] {
  const values: Record<string, string> = {}
  for (const key of [
    "closingFriday",
    ...REVIEW_COUNTER_KEYS,
    "status",
    "motivation",
    "wins",
    "blockers",
    "nextWeekPlan",
    "notes",
  ]) {
    values[key] = stringField(formData, key)
  }
  return values
}

function invalidateReviewCaches(): void {
  revalidatePath(ADMIN_WEEKLY_REVIEWS_PATH, "layout")
}

function mapReviewError(
  err: unknown,
  values: WeeklyReviewFormState["values"],
): WeeklyReviewFormState | null {
  if (isPrismaError(err, "P2002")) {
    return {
      ok: false,
      errors: { closingFriday: [WEEK_TAKEN] },
      message: "review_week_exists",
      values,
    }
  }
  return null
}

const reviewExists = (id: string) => rowExists(prisma.weeklyReview, { id })

function saveReview(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: WeeklyReviewInput) => Promise<{ id: string }>,
  updatedId?: string,
): Promise<WeeklyReviewFormState> {
  const values = collectValues(formData)

  return saveEntity<WeeklyReviewInput, WeeklyReviewFormState, { id: string }>({
    actionName,
    events,
    schema: weeklyReviewSchema,
    input: values,
    persist,
    successLogFields: (_data, review) => ({ id: review.id }),
    invalidateCaches: invalidateReviewCaches,
    mapError: (err) => mapReviewError(err, values),
    ...formStateHandlers(values, {
      message: "weekly_review_not_found",
      updatedId,
      exists: reviewExists,
    }),
  })
}

export async function createWeeklyReview(
  _prevState: WeeklyReviewFormState,
  formData: FormData,
): Promise<WeeklyReviewFormState> {
  // Défense en profondeur, hors du try : une Server Action exportée est joignable sans passer par la page.
  await getCurrentUser()

  return saveReview(
    "createWeeklyReview",
    { success: "weekly_review:created", failure: "weekly_review:create_failed" },
    formData,
    (data) => prisma.weeklyReview.create({ data }),
  )
}

export async function updateWeeklyReview(
  id: string,
  _prevState: WeeklyReviewFormState,
  formData: FormData,
): Promise<WeeklyReviewFormState> {
  await getCurrentUser()

  return saveReview(
    "updateWeeklyReview",
    { success: "weekly_review:updated", failure: "weekly_review:update_failed" },
    formData,
    (data) => prisma.weeklyReview.update({ where: { id }, data }),
    id,
  )
}

export async function deleteWeeklyReview(id: string): Promise<WeeklyReviewFormState> {
  await getCurrentUser()

  return deleteEntity<WeeklyReviewFormState>({
    actionName: "deleteWeeklyReview",
    events: { success: "weekly_review:deleted", failure: "weekly_review:delete_failed" },
    successLogFields: { id },
    exists: () => reviewExists(id),
    destroy: () => prisma.weeklyReview.delete({ where: { id } }),
    invalidateCaches: invalidateReviewCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}

// Lecture seule : rien n'est écrit avant « Enregistrer ».
export async function computeWeekCounters(
  isoFriday: string,
): Promise<{ ok: true; counts: ReviewCounts } | { ok: false }> {
  await getCurrentUser()

  return createActionLogger("computeWeekCounters", async ({ log }) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(isoFriday) || !isFridayIso(isoFriday)) return { ok: false }
    const bounds = weekBounds(isoDayToDate(isoFriday))
    try {
      const sources = await findWeekCounterSources(bounds)
      return { ok: true, counts: countWeek(sources, bounds, new Date()) }
    } catch (err) {
      log.error({ err, event: "weekly_review:count_failed" })
      return { ok: false }
    }
  })
}
