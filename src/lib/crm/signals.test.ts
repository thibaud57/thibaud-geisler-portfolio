import { describe, expect, it } from "vitest"

import type { SignalType } from "@/generated/prisma/client"

import { formatSignalDate, hasRecentSignal, signalFreshness } from "./signals"

const NOW = new Date("2026-09-27T12:00:00.000Z")

function signal(type: SignalType, isoDay: string) {
  return { type, occurredOn: new Date(`${isoDay}T00:00:00.000Z`) }
}

describe("signalFreshness", () => {
  it("rates a job offer recent, to confirm then stale at three and six months", () => {
    const recent = signalFreshness(signal("OFFRE_POSTE", "2026-07-01"), NOW)
    const toConfirm = signalFreshness(signal("OFFRE_POSTE", "2026-06-27"), NOW)
    const stale = signalFreshness(signal("OFFRE_POSTE", "2026-03-27"), NOW)

    expect([recent, toConfirm, stale]).toEqual(["RECENT", "A_CONFIRMER", "PERIME"])
  })

  it("applies the funding and team expansion thresholds", () => {
    const funding = signalFreshness(signal("LEVEE", "2025-09-01"), NOW)
    const expansion = signalFreshness(signal("EXPANSION", "2025-09-01"), NOW)

    expect(funding).toBe("A_CONFIRMER")
    expect(expansion).toBe("PERIME")
  })

  it("counts a month-dated signal from the first day of its month", () => {
    const juneOffer = { type: "OFFRE_POSTE" as const, occurredOn: new Date(Date.UTC(2026, 5, 1)) }

    const freshness = signalFreshness(juneOffer, NOW)

    expect(freshness).toBe("A_CONFIRMER")
    expect(formatSignalDate(juneOffer)).toBe("01/06/2026")
  })

  it("clamps a month-end signal to the last day of the target month", () => {
    const funding = signal("LEVEE", "2026-08-31")

    const lastDay = signalFreshness(funding, new Date("2027-02-27T12:00:00.000Z"))
    const nextDay = signalFreshness(funding, new Date("2027-02-28T12:00:00.000Z"))

    expect([lastDay, nextDay]).toEqual(["RECENT", "A_CONFIRMER"])
  })

  it("gives no freshness to an unrated type", () => {
    const pivot = signalFreshness(signal("PIVOT", "2026-09-01"), NOW)
    const post = signalFreshness(signal("POST", "2026-09-01"), NOW)

    expect(pivot).toBeNull()
    expect(post).toBeNull()
  })
})

describe("hasRecentSignal", () => {
  it("flags a record with at least one recent signal", () => {
    const unrated = [signal("PIVOT", "2026-09-01"), signal("LEVEE", "2024-01-01")]

    const without = hasRecentSignal(unrated, NOW)
    const withRecent = hasRecentSignal([...unrated, signal("NOUVEAU_PRODUIT", "2026-08-15")], NOW)

    expect(without).toBe(false)
    expect(withRecent).toBe(true)
  })
})
