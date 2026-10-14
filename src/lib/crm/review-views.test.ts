import { describe, expect, it } from "vitest"

import { reviewsForPeriod } from "./review-views"

const NOW = new Date(2026, 8, 27, 12, 0)

function review(id: string, friday: [number, number, number]) {
  return { id, closingFriday: new Date(Date.UTC(...friday)) }
}

describe("reviewsForPeriod", () => {
  it("keeps the reviews of the chosen period, most recent first", () => {
    const reviews = [
      review("early-september", [2026, 8, 11]),
      review("mid-august", [2026, 7, 21]),
      review("last-week", [2026, 8, 25]),
    ]

    const rows = reviewsForPeriod(reviews, "30j", NOW)

    expect(rows.map((row) => row.id)).toEqual(["last-week", "early-september"])
  })

  it("reads the current month in Paris time at a month boundary", () => {
    const justAfterMidnightInParis = new Date("2026-09-30T22:30:00.000Z")
    const reviews = [
      review("september-friday", [2026, 8, 25]),
      review("october-friday", [2026, 9, 2]),
    ]

    const rows = reviewsForPeriod(reviews, "mois", justAfterMidnightInParis)

    expect(rows.map((row) => row.id)).toEqual(["october-friday"])
  })
})
