import { describe, expect, it } from "vitest"

import { firstContactAtOf } from "./company-first-contact"

describe("firstContactAtOf", () => {
  it("keeps the earliest sent action across the company's persons", () => {
    const first = firstContactAtOf([
      { prospectingActions: [{ status: "FAIT", occurredAt: new Date(2026, 2, 10) }] },
      { prospectingActions: [{ status: "REPONDU", occurredAt: new Date(2026, 1, 1) }] },
    ])

    expect(first).toEqual(new Date(2026, 1, 1))
  })

  it("ignores to-do actions", () => {
    const first = firstContactAtOf([
      { prospectingActions: [{ status: "A_FAIRE", occurredAt: new Date(2026, 0, 1) }] },
      { prospectingActions: [{ status: "FAIT", occurredAt: new Date(2026, 2, 10) }] },
    ])

    expect(first).toEqual(new Date(2026, 2, 10))
  })

  it("returns null when no action was ever sent", () => {
    const first = firstContactAtOf([
      { prospectingActions: [{ status: "A_FAIRE", occurredAt: new Date(2026, 0, 1) }] },
      { prospectingActions: [] },
    ])

    expect(first).toBeNull()
  })
})
