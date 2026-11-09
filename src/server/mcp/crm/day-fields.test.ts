import { describe, expect, it } from "vitest"

import { zonedIsoDay } from "@/lib/date-time"
import { actionDayStart } from "@/lib/schemas/prospecting-action"

import { toDay, withDays } from "./day-fields"

describe("toDay", () => {
  it("reads a day as midnight UTC by default", () => {
    expect(toDay("2026-11-23")).toEqual(new Date("2026-11-23T00:00:00Z"))
  })

  it("reads a day with the given converter", () => {
    expect(toDay("2026-11-23", actionDayStart)).toEqual(new Date("2026-11-22T23:00:00Z"))
  })

  it("leaves an absent day absent", () => {
    expect(toDay(undefined)).toBeUndefined()
  })
})

describe("withDays", () => {
  it("formats the named columns as UTC days and keeps the other fields", () => {
    const row = { id: "s1", occurredOn: new Date("2026-09-14T00:00:00Z") }

    expect(withDays(row, ["occurredOn"])).toEqual({ id: "s1", occurredOn: "2026-09-14" })
  })

  it("formats each named column with the given formatter and keeps a null day null", () => {
    const row = {
      occurredAt: new Date("2026-11-22T23:00:00Z"),
      respondedAt: null,
      createdAt: new Date("2026-11-22T23:00:00Z"),
    }

    expect(withDays(row, ["occurredAt", "respondedAt"], zonedIsoDay)).toEqual({
      occurredAt: "2026-11-23",
      respondedAt: null,
      createdAt: row.createdAt,
    })
  })
})
