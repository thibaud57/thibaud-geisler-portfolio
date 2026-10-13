import { describe, expect, it } from "vitest"

import type { SignalType } from "@/generated/prisma/client"

import { formatSignalDate, hasRecentSignal, signalFreshness } from "./signals"

const NOW = new Date("2026-09-27T12:00:00.000Z")

function signal(type: SignalType, isoDay: string) {
  return { type, occurredOn: new Date(`${isoDay}T00:00:00.000Z`) }
}

describe("signalFreshness", () => {
  it.each([
    { type: "OFFRE_POSTE", day: "2026-07-01", expected: "RECENT" },
    { type: "OFFRE_POSTE", day: "2026-06-27", expected: "A_CONFIRMER" },
    { type: "OFFRE_POSTE", day: "2026-03-27", expected: "PERIME" },
    { type: "LEVEE", day: "2025-09-01", expected: "A_CONFIRMER" },
    { type: "EXPANSION", day: "2025-09-01", expected: "PERIME" },
    { type: "PIVOT", day: "2026-09-01", expected: null },
    { type: "POST", day: "2026-09-01", expected: null },
  ] as const)("rates a $type signal of $day as $expected", ({ type, day, expected }) => {
    const freshness = signalFreshness(signal(type, day), NOW)

    expect(freshness).toBe(expected)
  })

  it("counts a month-dated signal from the first day of its month", () => {
    const juneOffer = { type: "OFFRE_POSTE" as const, occurredOn: new Date(Date.UTC(2026, 5, 1)) }

    const freshness = signalFreshness(juneOffer, NOW)

    expect(freshness).toBe("A_CONFIRMER")
  })

  it.each([
    { label: "on the last day", now: "2027-02-27T12:00:00.000Z", expected: "RECENT" },
    { label: "the day after", now: "2027-02-28T12:00:00.000Z", expected: "A_CONFIRMER" },
  ])(
    "clamps a month-end signal to the last day of the target month ($label)",
    ({ now, expected }) => {
      const funding = signal("LEVEE", "2026-08-31")

      const freshness = signalFreshness(funding, new Date(now))

      expect(freshness).toBe(expected)
    },
  )
})

describe("formatSignalDate", () => {
  it("formats a month-dated signal as day/month/year", () => {
    const juneOffer = { type: "OFFRE_POSTE" as const, occurredOn: new Date(Date.UTC(2026, 5, 1)) }

    const formatted = formatSignalDate(juneOffer)

    expect(formatted).toBe("01/06/2026")
  })
})

describe("hasRecentSignal", () => {
  const unrated = [signal("PIVOT", "2026-09-01"), signal("LEVEE", "2024-01-01")]

  it("ignores a record without a recent signal", () => {
    const result = hasRecentSignal(unrated, NOW)

    expect(result).toBe(false)
  })

  it("flags a record with at least one recent signal", () => {
    const result = hasRecentSignal([...unrated, signal("NOUVEAU_PRODUIT", "2026-08-15")], NOW)

    expect(result).toBe(true)
  })
})
