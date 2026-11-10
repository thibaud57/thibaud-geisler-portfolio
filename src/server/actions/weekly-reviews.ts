"use server"

import "server-only"

import { assertNever } from "@/lib/assert-never"
import { getCurrentUser } from "@/lib/get-current-user"
import { weeklyReviewIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { recordFromKeys } from "@/lib/record-from-keys"
import {
  closingFridayField,
  weeklyReviewSchema,
  type WeeklyReviewInput,
} from "@/lib/schemas/weekly-review"
import { createActionLogger, rowExists, stringField } from "@/lib/server-utils"
import { REVIEW_COUNTER_KEYS, type ReviewCounts } from "@/lib/crm/weekly-reviews"
import type { DomainResult } from "@/server/crm/result"
import {
  computeWeekCounts,
  createWeeklyReview as createWeeklyReviewRecord,
  revalidateReviewLists,
  updateWeeklyReview as updateWeeklyReviewRecord,
  type WeeklyReviewWriteError,
  type WrittenWeeklyReview,
} from "@/server/crm/weekly-reviews"

import {
  type ActionEvents,
  deleteEntity,
  domainFailure,
  type DomainFailure,
  failureState,
  formStateHandlers,
  saveEntity,
} from "./_support/shared"
import type {
  WeeklyReviewDeleteState,
  WeeklyReviewFormMessage,
  WeeklyReviewFormState,
} from "./weekly-reviews.types"

const WEEK_TAKEN = "Une revue existe déjà pour cette semaine"

const FORM_FIELD_KEYS = [
  "closingFriday",
  ...REVIEW_COUNTER_KEYS,
  "status",
  "motivation",
  "wins",
  "blockers",
  "nextWeekPlan",
  "notes",
] as const

function collectValues(formData: FormData): WeeklyReviewFormState["values"] {
  return recordFromKeys(FORM_FIELD_KEYS, (key) => stringField(formData, key))
}

const failure = domainFailure<WeeklyReviewInput, WeeklyReviewFormMessage>

function mapDomainError(
  error: WeeklyReviewWriteError,
  values: WeeklyReviewFormState["values"],
): DomainFailure<WeeklyReviewFormState> {
  switch (error.code) {
    case "review_week_exists":
      return failure(values, { closingFriday: [WEEK_TAKEN] }, "review_week_exists")
    case "not_found":
      return failure(values, {}, "weekly_review_not_found", true)
    default:
      return assertNever(error)
  }
}

const reviewExists = (id: string) => rowExists(prisma.weeklyReview, { id })

function saveReview(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (
    data: WeeklyReviewInput,
  ) => Promise<DomainResult<WrittenWeeklyReview, WeeklyReviewWriteError>>,
): Promise<WeeklyReviewFormState> {
  const values = collectValues(formData)

  return saveEntity<
    WeeklyReviewInput,
    WeeklyReviewFormState,
    WrittenWeeklyReview,
    WeeklyReviewWriteError
  >({
    actionName,
    events,
    schema: weeklyReviewSchema,
    input: values,
    persist,
    successLogFields: (_data, review) => ({ id: review.id }),
    invalidateCaches: revalidateReviewLists,
    onDomainError: (error) => mapDomainError(error, values),
    ...formStateHandlers(values),
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
    createWeeklyReviewRecord,
  )
}

export async function updateWeeklyReview(
  rawId: string,
  _prevState: WeeklyReviewFormState,
  formData: FormData,
): Promise<WeeklyReviewFormState> {
  await getCurrentUser()

  const parsedId = weeklyReviewIdSchema.safeParse(rawId)
  if (!parsedId.success) {
    return failureState(
      mapDomainError({ code: "not_found" }, collectValues(formData)),
      revalidateReviewLists,
    )
  }
  const id = parsedId.data

  return saveReview(
    "updateWeeklyReview",
    { success: "weekly_review:updated", failure: "weekly_review:update_failed" },
    formData,
    (data) => updateWeeklyReviewRecord(id, data),
  )
}

export async function deleteWeeklyReview(id: string): Promise<WeeklyReviewDeleteState> {
  await getCurrentUser()

  return deleteEntity<WeeklyReviewDeleteState>({
    actionName: "deleteWeeklyReview",
    events: { success: "weekly_review:deleted", failure: "weekly_review:delete_failed" },
    successLogFields: { id },
    exists: () => reviewExists(id),
    destroy: () => prisma.weeklyReview.delete({ where: { id } }),
    invalidateCaches: revalidateReviewLists,
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
    const closingFriday = closingFridayField.safeParse(isoFriday)
    if (!closingFriday.success) return { ok: false }
    try {
      return { ok: true, counts: await computeWeekCounts(closingFriday.data, new Date()) }
    } catch (err) {
      log.error({ err, event: "weekly_review:count_failed" })
      return { ok: false }
    }
  })
}
