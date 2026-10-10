import { describe, expect, it } from "vitest"

import { formatStartMonth, toMonthValue } from "./opportunities"

describe("formatStartMonth", () => {
  it("shows the start month without shifting it to the previous month", () => {
    const firstOfApril = new Date("2026-04-01T00:00:00.000Z")

    const label = formatStartMonth(firstOfApril)
    const value = toMonthValue(firstOfApril)

    expect(label).toBe("avril 2026")
    expect(value).toBe("2026-04")
  })
})
