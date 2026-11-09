import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  calendarDaysBetween,
  dateColumnIsoDay,
  isoDayToDate,
  isSameZonedDay,
  isWithinCalendarDays,
  toInstant,
  zonedDayStart,
  zonedDayStartOf,
  zonedIsoDay,
} from "./date-time"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("zonedDayStart", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "UTC")
  })

  it.each([
    ["winter", "2026-01-10", 0, "2026-01-09T23:00:00.000Z"],
    ["summer", "2026-07-10", 0, "2026-07-09T22:00:00.000Z"],
    [
      "the day after the spring clock change, a 23-hour day later",
      "2026-03-29",
      1,
      "2026-03-29T22:00:00.000Z",
    ],
    [
      "the day after the autumn clock change, a 25-hour day later",
      "2026-10-25",
      1,
      "2026-10-25T23:00:00.000Z",
    ],
    ["six days back across the spring clock change", "2026-04-01", -6, "2026-03-25T23:00:00.000Z"],
  ])("returns Paris midnight in %s", (_label, dateOnly, offsetDays, expected) => {
    const start = zonedDayStart(new Date(dateOnly), offsetDays)

    expect(start.toISOString()).toBe(expected)
  })
})

describe("zonedDayStartOf", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "UTC")
  })

  it.each([
    ["an evening instant", "2026-07-10T21:30:00.000Z", 0, "2026-07-09T22:00:00.000Z"],
    [
      "an instant already on the next Paris day",
      "2026-07-10T22:30:00.000Z",
      0,
      "2026-07-10T22:00:00.000Z",
    ],
    ["the next day", "2026-07-10T22:30:00.000Z", 1, "2026-07-11T22:00:00.000Z"],
    ["the spring clock change day", "2026-03-29T10:00:00.000Z", 0, "2026-03-28T23:00:00.000Z"],
    [
      "the day after the spring clock change",
      "2026-03-29T10:00:00.000Z",
      1,
      "2026-03-29T22:00:00.000Z",
    ],
  ])("returns the Paris midnight of the day of %s", (_label, instant, offsetDays, expected) => {
    const start = zonedDayStartOf(new Date(instant), offsetDays)

    expect(start.toISOString()).toBe(expected)
  })
})

describe("zonedIsoDay", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "UTC")
  })

  it.each([
    ["Paris midnight in winter", "2026-01-09T23:00:00.000Z", "2026-01-10"],
    ["Paris midnight in summer", "2026-07-09T22:00:00.000Z", "2026-07-10"],
    ["an evening instant", "2026-07-10T21:30:00.000Z", "2026-07-10"],
  ])("reads the Paris day of %s", (_label, instant, expected) => {
    const day = zonedIsoDay(new Date(instant))

    expect(day).toBe(expected)
  })

  it("round-trips with zonedDayStart", () => {
    const day = zonedIsoDay(zonedDayStart(new Date("2026-03-29")))

    expect(day).toBe("2026-03-29")
  })
})

describe("isoDayToDate", () => {
  it("reads a day as midnight UTC", () => {
    const date = isoDayToDate("2026-03-29")

    expect(date.toISOString()).toBe("2026-03-29T00:00:00.000Z")
  })

  it.each(["", "2026-03", "2026-3-9", "2026-03-29T10:00:00Z", "abcd-ef-gh"])(
    "throws on the malformed day %j",
    (input) => {
      expect(() => isoDayToDate(input)).toThrow(`Expected a day as YYYY-MM-DD, got "${input}"`)
    },
  )
})

describe("dateColumnIsoDay", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "America/Los_Angeles")
  })

  it("reads the UTC day of a date column at midnight UTC", () => {
    const day = dateColumnIsoDay(new Date("2026-07-10T00:00:00.000Z"))

    expect(day).toBe("2026-07-10")
  })

  it("round-trips with isoDayToDate", () => {
    const day = dateColumnIsoDay(isoDayToDate("2026-03-29"))

    expect(day).toBe("2026-03-29")
  })
})

describe("isSameZonedDay", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "UTC")
  })

  it.each([
    [
      "two instants straddling Paris midnight",
      "2026-07-10T21:30:00.000Z",
      "2026-07-10T22:30:00.000Z",
      false,
    ],
    [
      "two instants on one Paris day but two UTC days",
      "2026-07-10T22:30:00.000Z",
      "2026-07-11T10:00:00.000Z",
      true,
    ],
  ])("tells %s apart", (_label, a, b, expected) => {
    const same = isSameZonedDay(new Date(a), new Date(b))

    expect(same).toBe(expected)
  })
})

describe("calendarDaysBetween", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Europe/Paris")
  })

  it.each([
    [
      "the same day at different hours",
      "2026-07-10T08:00:00+02:00",
      "2026-07-10T23:00:00+02:00",
      0,
    ],
    [
      "two adjacent days a few minutes apart",
      "2026-07-10T23:59:00+02:00",
      "2026-07-11T00:01:00+02:00",
      1,
    ],
    [
      "a week across the spring clock change",
      "2026-03-28T12:00:00+01:00",
      "2026-04-04T12:00:00+02:00",
      7,
    ],
    [
      "a week across the autumn clock change",
      "2026-10-24T12:00:00+02:00",
      "2026-10-31T12:00:00+01:00",
      7,
    ],
    ["reversed dates", "2026-07-17T12:00:00+02:00", "2026-07-10T12:00:00+02:00", 7],
  ])("counts %s", (_label, a, b, expected) => {
    const days = calendarDaysBetween(new Date(a), new Date(b))

    expect(days).toBe(expected)
  })
})

describe("isWithinCalendarDays", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Europe/Paris")
  })

  it.each([
    ["on the boundary day, whatever the hour", "2026-07-03T23:59:00+02:00", true],
    ["one day past the boundary", "2026-07-02T00:01:00+02:00", false],
  ])("is decided %s", (_label, occurredAt, expected) => {
    const within = isWithinCalendarDays(
      new Date("2026-07-10T08:00:00+02:00"),
      new Date(occurredAt),
      7,
    )

    expect(within).toBe(expected)
  })
})

describe("toInstant", () => {
  beforeEach(() => {
    vi.stubEnv("TZ", "Europe/Paris")
  })

  it.each([
    ["winter", "2026-01-10T00:00:00+01:00", "09:30", "2026-01-10T08:30:00.000Z"],
    ["summer", "2026-07-10T00:00:00+02:00", "09:30", "2026-07-10T07:30:00.000Z"],
    [
      "just before the spring clock change",
      "2026-03-29T00:00:00+01:00",
      "01:30",
      "2026-03-29T00:30:00.000Z",
    ],
    [
      "just after the spring clock change",
      "2026-03-29T00:00:00+01:00",
      "03:30",
      "2026-03-29T01:30:00.000Z",
    ],
  ])("carries the Paris offset in %s", (_label, date, time, expected) => {
    const instant = toInstant(date ? new Date(date) : undefined, time)

    expect(instant).toBe(expected)
  })

  it.each([
    ["a missing date", undefined, "09:30"],
    ["a malformed time", "2026-07-10T00:00:00+02:00", "9:30"],
    ["an empty time", "2026-07-10T00:00:00+02:00", ""],
  ])("returns null for %s", (_label, date, time) => {
    const instant = toInstant(date ? new Date(date) : undefined, time)

    expect(instant).toBeNull()
  })
})
