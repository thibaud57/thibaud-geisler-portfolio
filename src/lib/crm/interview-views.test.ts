import { describe, expect, it } from "vitest"

import type { InterviewStatus } from "@/generated/prisma/client"

import { interviewsForView } from "./interview-views"

interface TestInterview {
  id: string
  status: InterviewStatus
  scheduledAt: Date
}

function interview(overrides: Partial<TestInterview> = {}): TestInterview {
  return { id: "i1", status: "PLANIFIE", scheduledAt: new Date(2026, 8, 28, 10, 0), ...overrides }
}

function idsOf(interviews: readonly TestInterview[]): string[] {
  return interviews.map((row) => row.id)
}

function weekInterviews(): TestInterview[] {
  return [
    interview({ id: "next-week", scheduledAt: new Date(2026, 9, 4, 10, 0) }),
    interview({ id: "this-morning", scheduledAt: new Date(2026, 8, 27, 9, 0) }),
    interview({ id: "tomorrow", scheduledAt: new Date(2026, 8, 28, 10, 0) }),
    interview({ id: "done", status: "FAIT", scheduledAt: new Date(2026, 8, 20, 10, 0) }),
    interview({ id: "cancelled", status: "ANNULE", scheduledAt: new Date(2026, 9, 1, 10, 0) }),
  ]
}

describe("interviewsForView", () => {
  it("keeps every planned interview in the upcoming view, overdue first then the next one", () => {
    const rows = interviewsForView(weekInterviews(), "a-venir")

    expect(idsOf(rows)).toEqual(["this-morning", "tomorrow", "next-week"])
  })

  it("keeps every interview in the journal, most recent first", () => {
    const rows = interviewsForView(weekInterviews(), "journal")

    expect(idsOf(rows)).toEqual(["next-week", "cancelled", "tomorrow", "this-morning", "done"])
  })
})
