import { describe, expect, it, vi } from "vitest"
import { formatProjectDuration, getProjectDuration, getProjectTimeline } from "./projects"

describe("getProjectTimeline", () => {
  it("détecte un projet en cours (startedAt défini, endedAt null)", () => {
    const timeline = getProjectTimeline(new Date("2023-06-01"), null)
    expect(timeline).toEqual({ startYear: 2023, endYear: null, inProgress: true })
  })

  it("détecte un projet terminé (startedAt + endedAt définis)", () => {
    const timeline = getProjectTimeline(new Date("2022-03-01"), new Date("2024-11-15"))
    expect(timeline).toEqual({ startYear: 2022, endYear: 2024, inProgress: false })
  })

  it("ne considère pas un projet sans startedAt comme en cours même si endedAt est null", () => {
    const timeline = getProjectTimeline(null, null)
    expect(timeline.inProgress).toBe(false)
  })

  it("expose startYear et endYear null quand les dates sont absentes", () => {
    const timeline = getProjectTimeline(null, null)
    expect(timeline).toEqual({ startYear: null, endYear: null, inProgress: false })
  })
})

describe("getProjectDuration", () => {
  it("splits the span between the two dates into years and months", () => {
    const duration = getProjectDuration(new Date(2022, 0, 10), new Date(2025, 2, 1))

    expect(duration).toEqual({ years: 3, months: 2 })
  })

  it("counts at least one month for a project started and ended within the same month", () => {
    const duration = getProjectDuration(new Date(2024, 4, 3), new Date(2024, 4, 20))

    expect(duration).toEqual({ years: 0, months: 1 })
  })

  it("returns null without both dates or on an inverted range", () => {
    expect(getProjectDuration(null, new Date(2024, 0, 1))).toBeNull()
    expect(getProjectDuration(new Date(2024, 0, 1), null)).toBeNull()
    expect(getProjectDuration(new Date(2024, 4, 20), new Date(2024, 4, 1))).toBeNull()
  })
})

describe("formatProjectDuration", () => {
  it("counts an in-progress project up to today", () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 8, 22))

    const label = formatProjectDuration(new Date(2025, 5, 1), null)

    expect(label).toBe("1 an 3 mois")
    vi.useRealTimers()
  })
})
