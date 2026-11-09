import "server-only"
import { revalidatePath } from "next/cache"

import { ADMIN_WEEKLY_REVIEWS_PATH } from "@/lib/admin/routes"
import { countWeek, weekBounds } from "@/lib/crm/review-counters"
import { REVIEW_COUNTER_KEYS, type ReviewCounts } from "@/lib/crm/weekly-reviews"
import { weeklyReviewIdSchema, type WeeklyReviewId } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { recordFromKeys } from "@/lib/record-from-keys"
import type { WeeklyReviewInput } from "@/lib/schemas/weekly-review"
import { isPrismaError, isRowGone, rowExists } from "@/lib/server-utils"
import { findWeekCounterSources } from "@/server/queries/weekly-reviews"

import { fail, ok, type DomainResult } from "./result"

// Un compteur absent est calculé par l'app à la création, comme le préremplissage de l'admin.
export type WeeklyReviewWriteData = Omit<WeeklyReviewInput, keyof ReviewCounts> &
  Partial<ReviewCounts>

// Un champ absent reste inchangé, un compteur absent n'est jamais recalculé.
export type WeeklyReviewPatch = Partial<WeeklyReviewInput>

export type WeeklyReviewWriteError = { code: "review_week_exists" } | { code: "not_found" }

export interface WrittenWeeklyReview {
  id: WeeklyReviewId
}

const toWritten = (row: { id: string }): WrittenWeeklyReview => ({
  id: weeklyReviewIdSchema.parse(row.id),
})

export function revalidateReviewLists(): void {
  revalidatePath(ADMIN_WEEKLY_REVIEWS_PATH, "layout")
}

// Les compteurs de la semaine close à ce vendredi, tels que l'app les calcule : source commune de la création et du préremplissage de l'admin.
export async function computeWeekCounts(closingFriday: Date, now: Date): Promise<ReviewCounts> {
  const bounds = weekBounds(closingFriday)
  return countWeek(await findWeekCounterSources(bounds), bounds, now)
}

async function countersOf(data: WeeklyReviewWriteData): Promise<Partial<ReviewCounts>> {
  if (REVIEW_COUNTER_KEYS.every((key) => data[key] !== undefined)) return {}

  const computed = await computeWeekCounts(data.closingFriday, new Date())
  return recordFromKeys(REVIEW_COUNTER_KEYS, (key) => data[key] ?? computed[key])
}

export async function createWeeklyReview(
  data: WeeklyReviewWriteData,
): Promise<DomainResult<WrittenWeeklyReview, WeeklyReviewWriteError>> {
  try {
    const created = await prisma.weeklyReview.create({
      data: { ...data, ...(await countersOf(data)) },
      select: { id: true },
    })
    return ok(toWritten(created))
  } catch (err) {
    if (isPrismaError(err, "P2002")) return fail({ code: "review_week_exists" })
    throw err
  }
}

export async function updateWeeklyReview(
  id: WeeklyReviewId,
  patch: WeeklyReviewPatch,
): Promise<DomainResult<WrittenWeeklyReview, WeeklyReviewWriteError>> {
  try {
    const updated = await prisma.weeklyReview.update({
      where: { id },
      data: patch,
      select: { id: true },
    })
    return ok(toWritten(updated))
  } catch (err) {
    if (isPrismaError(err, "P2002")) return fail({ code: "review_week_exists" })
    if (await isRowGone(err, () => rowExists(prisma.weeklyReview, { id }))) {
      return fail({ code: "not_found" })
    }
    throw err
  }
}
