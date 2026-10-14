import { describe, expect, it } from "vitest"

import {
  defaultClosingFriday,
  formatRate,
  fridayOfWeek,
  parseCounterInputs,
  reviewRates,
  weekLabel,
} from "./weekly-reviews"

const COUNTS = {
  connectionsSent: 18,
  connectionsAccepted: 9,
  messagesSent: 14,
  conversationsEngaged: 5,
  meetingsBooked: 2,
  interviewsHeld: 1,
  activeLeads: 4,
}

describe("reviewRates", () => {
  it("computes the three rates rounded to the unit", () => {
    const rates = reviewRates(COUNTS)

    expect(rates).toEqual({ acceptance: 50, response: 36, meetingConversion: 40 })
  })

  it("leaves the rate empty when the denominator is zero", () => {
    const rates = reviewRates({ ...COUNTS, messagesSent: 0, conversationsEngaged: 0 })

    expect(rates.response).toBeNull()
    expect(rates.meetingConversion).toBeNull()
  })
})

describe("formatRate", () => {
  it.each([
    { label: "a rate as a percentage", rate: 50, expected: "50 %" },
    { label: "an empty rate as null", rate: null, expected: null },
  ])("formats $label", ({ rate, expected }) => {
    const formatted = formatRate(rate)

    expect(formatted).toBe(expected)
  })
})

describe("weekLabel", () => {
  it.each([
    { label: "a September week", date: new Date(Date.UTC(2026, 8, 4)), expected: "S36 · 2026" },
    {
      label: "the first days of January",
      date: new Date(Date.UTC(2026, 0, 2)),
      expected: "S01 · 2026",
    },
    {
      label: "the 1st of January 2027",
      date: new Date(Date.UTC(2027, 0, 1)),
      expected: "S53 · 2026",
    },
  ])("labels $label with its ISO number and year", ({ date, expected }) => {
    const label = weekLabel(date)

    expect(label).toBe(expected)
  })
})

describe("defaultClosingFriday", () => {
  it.each([
    { label: "a Friday", now: new Date(2026, 8, 25, 18, 0), expected: new Date(2026, 8, 25) },
    { label: "a Saturday", now: new Date(2026, 8, 26, 10, 0), expected: new Date(2026, 8, 25) },
    { label: "a Thursday", now: new Date(2026, 9, 1, 9, 0), expected: new Date(2026, 8, 25) },
  ])("closes on the last Friday from $label", ({ now, expected }) => {
    const friday = defaultClosingFriday(now)

    expect(friday).toEqual(expected)
  })
})

describe("fridayOfWeek", () => {
  it.each([
    { label: "Monday", day: new Date(2026, 8, 21), expected: new Date(2026, 8, 25) },
    { label: "Friday", day: new Date(2026, 8, 25), expected: new Date(2026, 8, 25) },
    { label: "Saturday", day: new Date(2026, 8, 26), expected: new Date(2026, 9, 2) },
    { label: "Sunday", day: new Date(2026, 8, 27), expected: new Date(2026, 9, 2) },
    {
      label: "30 September, across the month boundary",
      day: new Date(2026, 8, 30),
      expected: new Date(2026, 9, 2),
    },
  ])("resolves $label to the Friday of its week", ({ day, expected }) => {
    const friday = fridayOfWeek(day)

    expect(friday).toEqual(expected)
  })
})

describe("parseCounterInputs", () => {
  it("reads an empty input as zero, like the server", () => {
    const counts = parseCounterInputs({
      connectionsSent: "12",
      connectionsAccepted: "",
      messagesSent: "0",
      conversationsEngaged: "3",
      meetingsBooked: "",
      interviewsHeld: "1",
      activeLeads: "4",
    })

    expect(counts).toEqual({
      connectionsSent: 12,
      connectionsAccepted: 0,
      messagesSent: 0,
      conversationsEngaged: 3,
      meetingsBooked: 0,
      interviewsHeld: 1,
      activeLeads: 4,
    })
  })
})
