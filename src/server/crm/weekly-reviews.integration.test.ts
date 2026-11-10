import { beforeEach, describe, expect, it, onTestFinished, vi } from "vitest"

import { weeklyReviewIdSchema } from "@/lib/ids"
import { isoDayToDate } from "@/lib/date-time"
import {
  CLOSED_WEEK_COUNTS,
  CLOSED_WEEK_FRIDAY,
  prisma,
  resetDatabase,
  seedClosedWeek,
  storedReview,
} from "@/lib/prisma-test-setup"

import {
  createWeeklyReview,
  updateWeeklyReview,
  type WeeklyReviewWriteData,
} from "./weekly-reviews"

const UNKNOWN_REVIEW = weeklyReviewIdSchema.parse("missing-review")

function reviewData(overrides: Partial<WeeklyReviewWriteData> = {}): WeeklyReviewWriteData {
  return {
    closingFriday: isoDayToDate(CLOSED_WEEK_FRIDAY),
    status: null,
    motivation: null,
    wins: null,
    blockers: null,
    nextWeekPlan: null,
    notes: null,
    ...overrides,
  }
}

const STORED_COUNTS = {
  connectionsSent: 5,
  connectionsAccepted: 4,
  messagesSent: 3,
  conversationsEngaged: 2,
  meetingsBooked: 1,
  interviewsHeld: 6,
  activeLeads: 7,
}

async function seedReview(closingFriday: string, data: Partial<typeof STORED_COUNTS> = {}) {
  const row = await prisma.weeklyReview.create({
    data: { closingFriday: isoDayToDate(closingFriday), ...STORED_COUNTS, ...data },
  })
  return weeklyReviewIdSchema.parse(row.id)
}

beforeEach(async () => {
  await resetDatabase()
})

describe("createWeeklyReview", () => {
  it("computes the seven counters when absent, like the admin prefill", async () => {
    await seedClosedWeek()

    const result = await createWeeklyReview(reviewData())

    const stored = await prisma.weeklyReview.findFirstOrThrow()
    expect(result).toEqual({ ok: true, value: { id: stored.id } })
    expect(stored).toMatchObject({
      closingFriday: isoDayToDate(CLOSED_WEEK_FRIDAY),
      ...CLOSED_WEEK_COUNTS,
    })
  })

  it("keeps provided counters and computes the others", async () => {
    await seedClosedWeek()

    await createWeeklyReview(reviewData({ connectionsSent: 9, activeLeads: 0 }))

    expect(await prisma.weeklyReview.findFirstOrThrow()).toMatchObject({
      ...CLOSED_WEEK_COUNTS,
      connectionsSent: 9,
      activeLeads: 0,
    })
  })

  it("stores the qualitative fields", async () => {
    const result = await createWeeklyReview(
      reviewData({
        ...STORED_COUNTS,
        status: "BONNE",
        motivation: "HAUTE",
        wins: "Deux réponses",
        blockers: "Peu de leads",
        nextWeekPlan: "Relancer Acme",
        notes: "RAS",
      }),
    )

    expect(result.ok).toBe(true)
    expect(await prisma.weeklyReview.findFirstOrThrow()).toMatchObject({
      status: "BONNE",
      motivation: "HAUTE",
      wins: "Deux réponses",
      blockers: "Peu de leads",
      nextWeekPlan: "Relancer Acme",
      notes: "RAS",
    })
  })

  it("rejects a second review for the same Friday", async () => {
    await seedReview(CLOSED_WEEK_FRIDAY)

    const result = await createWeeklyReview(reviewData())

    expect(result).toEqual({ ok: false, error: { code: "review_week_exists" } })
    expect(await prisma.weeklyReview.count()).toBe(1)
  })
})

describe("updateWeeklyReview", () => {
  it("leaves counters unchanged on an update that omits them, even over a week with activity", async () => {
    await seedClosedWeek()
    const id = await seedReview("2026-10-23")

    const result = await updateWeeklyReview(id, {
      closingFriday: isoDayToDate(CLOSED_WEEK_FRIDAY),
      wins: "Une réponse",
    })

    expect(result).toEqual({ ok: true, value: { id } })
    expect(await storedReview(id)).toMatchObject({ ...STORED_COUNTS, wins: "Une réponse" })
  })

  it("changes the sent fields only and clears a field with null", async () => {
    const id = await seedReview("2026-10-23", { connectionsSent: 5 })
    await prisma.weeklyReview.update({ where: { id }, data: { wins: "Ancien", notes: "Note" } })

    await updateWeeklyReview(id, { connectionsSent: 8, wins: null })

    expect(await storedReview(id)).toMatchObject({
      ...STORED_COUNTS,
      connectionsSent: 8,
      wins: null,
      notes: "Note",
    })
  })

  it("rejects moving a review onto a Friday already reviewed", async () => {
    await seedReview(CLOSED_WEEK_FRIDAY)
    const id = await seedReview("2026-10-23")

    const result = await updateWeeklyReview(id, { closingFriday: isoDayToDate(CLOSED_WEEK_FRIDAY) })

    expect(result).toEqual({ ok: false, error: { code: "review_week_exists" } })
    expect((await storedReview(id)).closingFriday).toEqual(isoDayToDate("2026-10-23"))
  })

  it("reports a review that does not exist", async () => {
    const result = await updateWeeklyReview(UNKNOWN_REVIEW, { wins: "x" })

    expect(result).toEqual({ ok: false, error: { code: "not_found" } })
  })
})

describe("updateWeeklyReview when the write reports a missing record", () => {
  const P2025 = { code: "P2025" }

  function rejectNextUpdate() {
    const update = vi.spyOn(prisma.weeklyReview, "update").mockRejectedValueOnce(P2025)
    onTestFinished(() => {
      update.mockRestore()
    })
  }

  it("rethrows the error when the review still exists", async () => {
    const id = await seedReview("2026-10-23")
    rejectNextUpdate()

    const result = updateWeeklyReview(id, { wins: "x" })

    await expect(result).rejects.toBe(P2025)
  })
})
