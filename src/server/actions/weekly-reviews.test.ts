import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }))
vi.mock("@/lib/logger", () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    weeklyReview: {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn(),
    },
  },
}))
vi.mock("@/lib/get-current-user", () => ({ getCurrentUser: vi.fn() }))

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { NONE_VALUE } from "@/lib/schemas/none-value"

import { createWeeklyReview, deleteWeeklyReview, updateWeeklyReview } from "./weekly-reviews"
import { initialWeeklyReviewFormState } from "./weekly-reviews.types"

const BASE_FIELDS = {
  closingFriday: "2026-09-11",
  connectionsSent: "18",
  connectionsAccepted: "9",
  messagesSent: "14",
  conversationsEngaged: "5",
  meetingsBooked: "2",
  interviewsHeld: "1",
  activeLeads: "4",
  status: NONE_VALUE,
  motivation: NONE_VALUE,
  wins: "",
  blockers: "",
  nextWeekPlan: "",
  notes: "",
}

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  return data
}

// Les matchers asymétriques de Vitest sont typés `any` : le passage par `unknown` les requalifie ici.
function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

// `vi.clearAllMocks` n'efface que les appels : les réponses sont remises à chaque test.
beforeEach(() => {
  vi.mocked(prisma.weeklyReview.findFirst).mockResolvedValue(null)
  vi.mocked(prisma.weeklyReview.create).mockResolvedValue({ id: "r1" } as never)
  vi.mocked(prisma.weeklyReview.update).mockResolvedValue({ id: "r1" } as never)
})

afterEach(() => {
  vi.clearAllMocks()
})

describe("createWeeklyReview", () => {
  it("rejects a day that is not a Friday", async () => {
    const state = await createWeeklyReview(
      initialWeeklyReviewFormState,
      buildFormData({ closingFriday: "2026-09-10" }),
    )

    expect(state.errors.closingFriday).toEqual(["Choisissez un vendredi"])
    expect(prisma.weeklyReview.create).not.toHaveBeenCalled()
  })

  it("refuses a second review for the same week", async () => {
    vi.mocked(prisma.weeklyReview.findFirst).mockResolvedValue({ id: "r0" } as never)

    const state = await createWeeklyReview(initialWeeklyReviewFormState, buildFormData())

    expect(state.message).toBe("review_week_exists")
    expect(state.errors.closingFriday).toEqual(["Une revue existe déjà pour cette semaine"])
    expect(prisma.weeklyReview.create).not.toHaveBeenCalled()
  })

  it("rejects a negative counter", async () => {
    const state = await createWeeklyReview(
      initialWeeklyReviewFormState,
      buildFormData({ messagesSent: "-1" }),
    )

    expect(state.errors.messagesSent).toEqual(["Un entier de 0 à 999"])
    expect(prisma.weeklyReview.create).not.toHaveBeenCalled()
  })

  it("rejects a call without a session, before touching the database", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error("UNAUTHORIZED"))

    const result = createWeeklyReview(initialWeeklyReviewFormState, buildFormData())

    await expect(result).rejects.toThrow()
    expect(prisma.weeklyReview.findFirst).not.toHaveBeenCalled()
  })
})

describe("updateWeeklyReview", () => {
  it("ignores the review being edited when checking its week", async () => {
    await updateWeeklyReview("r1", initialWeeklyReviewFormState, buildFormData())

    expect(prisma.weeklyReview.findFirst).toHaveBeenCalledWith(
      objectMatch({ where: objectMatch({ NOT: { id: "r1" } }) }),
    )
  })

  it("answers weekly_review_not_found when the review was deleted meanwhile", async () => {
    vi.mocked(prisma.weeklyReview.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.weeklyReview.count).mockResolvedValueOnce(0)

    const state = await updateWeeklyReview("r1", initialWeeklyReviewFormState, buildFormData())

    expect(state.message).toBe("weekly_review_not_found")
  })

  it("answers unknown_error on a P2025 while the review still exists", async () => {
    vi.mocked(prisma.weeklyReview.update).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.weeklyReview.count).mockResolvedValueOnce(1)

    const state = await updateWeeklyReview("r1", initialWeeklyReviewFormState, buildFormData())

    expect(state.message).toBe("unknown_error")
  })
})

describe("deleteWeeklyReview", () => {
  it("treats a review already deleted elsewhere as deleted", async () => {
    vi.mocked(prisma.weeklyReview.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.weeklyReview.count).mockResolvedValueOnce(0)

    const state = await deleteWeeklyReview("r1")

    expect(state.ok).toBe(true)
  })

  it("answers unknown_error on a P2025 while the review still exists", async () => {
    vi.mocked(prisma.weeklyReview.delete).mockRejectedValueOnce({ code: "P2025" })
    vi.mocked(prisma.weeklyReview.count).mockResolvedValueOnce(1)

    const state = await deleteWeeklyReview("r1")

    expect(state.message).toBe("unknown_error")
  })
})
