import { describe, expect, it } from "vitest"
import { z } from "zod"

import { dateColumnDay, withDays, zonedDay } from "./day-fields"

describe("dateColumnDay", () => {
  const codec = dateColumnDay({ example: "2026-09-14" })

  it("reads a day as midnight UTC", () => {
    expect(codec.parse("2026-11-23")).toEqual(new Date("2026-11-23T00:00:00Z"))
  })

  it("writes a column back as its day", () => {
    expect(z.encode(codec, new Date("2026-11-23T00:00:00Z"))).toBe("2026-11-23")
  })

  it("refuses a day that does not exist, with the example of the entity", () => {
    const result = codec.safeParse("2026-02-31")

    expect(result.error?.issues[0]?.message).toBe("Expected a day as YYYY-MM-DD, e.g. 2026-09-14.")
  })

  it("shows the agent a date string", () => {
    expect(z.toJSONSchema(codec, { io: "input" })).toMatchObject({
      type: "string",
      format: "date",
    })
  })
})

describe("zonedDay", () => {
  const codec = zonedDay()

  it("reads a day as midnight in Paris", () => {
    expect(codec.parse("2026-11-23")).toEqual(new Date("2026-11-22T23:00:00Z"))
  })

  it("writes an instant back as its day in Paris", () => {
    expect(z.encode(codec, new Date("2026-11-22T23:00:00Z"))).toBe("2026-11-23")
  })
})

describe("withDays", () => {
  it("formats the named columns as UTC days and keeps the other fields", () => {
    const row = { id: "s1", occurredOn: new Date("2026-09-14T00:00:00Z") }

    expect(withDays(row, ["occurredOn"])).toEqual({ id: "s1", occurredOn: "2026-09-14" })
  })

  it("formats each named column with the given codec and keeps a null day null", () => {
    const row = {
      occurredAt: new Date("2026-11-22T23:00:00Z"),
      respondedAt: null,
      createdAt: new Date("2026-11-22T23:00:00Z"),
    }

    expect(withDays(row, ["occurredAt", "respondedAt"], zonedDay())).toEqual({
      occurredAt: "2026-11-23",
      respondedAt: null,
      createdAt: row.createdAt,
    })
  })
})
