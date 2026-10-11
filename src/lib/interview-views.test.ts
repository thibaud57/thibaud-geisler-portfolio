import { describe, expect, it } from "vitest"

import type { InterviewStatus } from "@/generated/prisma/client"

import { interviewsForView } from "./interview-views"

const NOW = new Date(2026, 8, 27, 12, 0).getTime()

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
  it("keeps planned interviews still to come in the upcoming view, soonest first", () => {
    const rows = interviewsForView(weekInterviews(), "a-venir", NOW)

    expect(idsOf(rows)).toEqual(["tomorrow", "next-week"])
  })

  it("keeps every interview in the journal, most recent first", () => {
    const rows = interviewsForView(weekInterviews(), "journal", NOW)

    expect(idsOf(rows)).toEqual(["next-week", "cancelled", "tomorrow", "this-morning", "done"])
  })

  it("keeps a planned interview scheduled exactly now in the upcoming view", () => {
    const atNow = interview({ id: "now", scheduledAt: new Date(NOW) })

    const rows = interviewsForView([atNow], "a-venir", NOW)

    expect(idsOf(rows)).toEqual(["now"])
  })
})
