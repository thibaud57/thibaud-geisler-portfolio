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
    expect(formatRate(rates.acceptance)).toBe("50 %")
  })

  it("leaves the rate empty when the denominator is zero", () => {
    const rates = reviewRates({ ...COUNTS, messagesSent: 0, conversationsEngaged: 0 })

    expect(rates.response).toBeNull()
    expect(rates.meetingConversion).toBeNull()
    expect(formatRate(rates.response)).toBeNull()
  })
})

describe("weekLabel", () => {
  it("labels the week with its ISO number across the year boundary", () => {
    const summer = weekLabel(new Date(Date.UTC(2026, 8, 4)))
    const newYear = weekLabel(new Date(Date.UTC(2026, 0, 2)))
    const lastWeek = weekLabel(new Date(Date.UTC(2027, 0, 1)))

    expect(summer).toBe("S36 · Semaine du 31/08/2026")
    expect(newYear).toBe("S01 · Semaine du 29/12/2025")
    expect(lastWeek).toBe("S53 · Semaine du 28/12/2026")
  })
})

describe("defaultClosingFriday", () => {
  it("defaults to today on a Friday, otherwise to the last Friday", () => {
    const friday = defaultClosingFriday(new Date(2026, 8, 25, 18, 0))
    const saturday = defaultClosingFriday(new Date(2026, 8, 26, 10, 0))
    const thursday = defaultClosingFriday(new Date(2026, 9, 1, 9, 0))

    expect(friday).toEqual(new Date(2026, 8, 25))
    expect(saturday).toEqual(new Date(2026, 8, 25))
    expect(thursday).toEqual(new Date(2026, 8, 25))
  })
})

describe("fridayOfWeek", () => {
  it("resolves any day of a Monday to Sunday week to its Friday", () => {
    const monday = fridayOfWeek(new Date(2026, 8, 21))
    const friday = fridayOfWeek(new Date(2026, 8, 25))
    const sunday = fridayOfWeek(new Date(2026, 8, 27))

    expect(monday).toEqual(new Date(2026, 8, 25))
    expect(friday).toEqual(new Date(2026, 8, 25))
    expect(sunday).toEqual(new Date(2026, 8, 25))
  })

  it("crosses the month boundary", () => {
    const friday = fridayOfWeek(new Date(2026, 8, 30))

    expect(friday).toEqual(new Date(2026, 9, 2))
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
