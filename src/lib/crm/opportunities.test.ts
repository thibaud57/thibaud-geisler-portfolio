import { describe, expect, it } from "vitest"

import { formatRhythm, formatStartMonth, toMonthValue } from "./opportunities"

describe("formatStartMonth", () => {
  it("shows the start month without shifting it to the previous month", () => {
    const firstOfApril = new Date("2026-04-01T00:00:00.000Z")

    const label = formatStartMonth(firstOfApril)
    const value = toMonthValue(firstOfApril)

    expect(label).toBe("avril 2026")
    expect(value).toBe("2026-04")
  })
})

describe("formatRhythm", () => {
  it.each([
    [4, 2, "4 j dont 2 sur site"],
    [4, null, "4 j"],
    [null, 2, "2 j sur site"],
    [null, null, null],
  ] as const)("shows %s days with %s on site as %s", (daysPerWeek, onSiteDays, expected) => {
    const rhythm = formatRhythm(daysPerWeek, onSiteDays)

    expect(rhythm).toBe(expected)
  })
})
