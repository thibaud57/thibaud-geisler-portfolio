import { describe, expect, it } from "vitest"

import type { OpportunityStatus } from "@/generated/prisma/client"

import { opportunitiesForView } from "./opportunity-views"

interface TestOpportunity {
  id: string
  status: OpportunityStatus
  startMonth: Date | null
  updatedAt: Date
}

function opportunity(overrides: Partial<TestOpportunity> = {}): TestOpportunity {
  return {
    id: "o1",
    status: "PROPOSEE",
    startMonth: null,
    updatedAt: new Date("2026-09-01T00:00:00.000Z"),
    ...overrides,
  }
}

describe("opportunitiesForView", () => {
  it("keeps proposed, in-process and offered opportunities in the ongoing view, soonest start first", () => {
    const opportunities = [
      opportunity({
        id: "proposed",
        status: "PROPOSEE",
        startMonth: new Date("2026-06-01T00:00:00.000Z"),
      }),
      opportunity({ id: "offered", status: "OFFRE_RECUE", startMonth: null }),
      opportunity({
        id: "in-process",
        status: "EN_PROCESS",
        startMonth: new Date("2026-04-01T00:00:00.000Z"),
      }),
      opportunity({ id: "accepted", status: "ACCEPTEE" }),
      opportunity({ id: "paused", status: "EN_PAUSE" }),
    ]

    const rows = opportunitiesForView(opportunities, "en-cours")

    expect(rows.map(({ id }) => id)).toEqual(["in-process", "proposed", "offered"])
  })

  it("keeps accepted opportunities in the accepted view", () => {
    const opportunities = [
      opportunity({
        id: "older",
        status: "ACCEPTEE",
        startMonth: new Date("2025-01-01T00:00:00.000Z"),
      }),
      opportunity({ id: "refused", status: "REFUSEE" }),
      opportunity({
        id: "newer",
        status: "ACCEPTEE",
        startMonth: new Date("2026-01-01T00:00:00.000Z"),
      }),
    ]

    const rows = opportunitiesForView(opportunities, "acceptees")

    expect(rows.map(({ id }) => id)).toEqual(["newer", "older"])
  })
})
