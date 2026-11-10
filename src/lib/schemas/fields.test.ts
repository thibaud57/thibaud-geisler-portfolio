import { describe, expect, it } from "vitest"

import { optionalDateField } from "./fields"

describe("optionalDateField", () => {
  it("reads a day as the midnight UTC of a date column", () => {
    const result = optionalDateField.parse("2026-10-05")

    expect(result).toEqual(new Date("2026-10-05T00:00:00Z"))
  })

  it("reads an empty field as no date", () => {
    const result = optionalDateField.parse("")

    expect(result).toBeNull()
  })

  it.each(["2026-02-31", "2026-10-5"])(
    "rejects %s instead of rolling it over or shifting it by the time zone",
    (value) => {
      const result = optionalDateField.safeParse(value)

      expect(result.success).toBe(false)
    },
  )
})
