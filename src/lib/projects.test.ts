import { describe, expect, it } from "vitest"
import { formatProjectDuration, getProjectDuration, getProjectTimeline } from "./projects"

describe("getProjectTimeline", () => {
  it("reports a project with a start date and no end date as ongoing", () => {
    const timeline = getProjectTimeline(new Date("2023-06-01"), null)

    expect(timeline).toEqual({ kind: "ongoing", startYear: 2023 })
  })

  it("reports a project with both dates as ended", () => {
    const timeline = getProjectTimeline(new Date("2022-03-01"), new Date("2024-11-15"))

    expect(timeline).toEqual({ kind: "ended", startYear: 2022, endYear: 2024 })
  })

  it("reports a project without a start date as having no timeline", () => {
    const timeline = getProjectTimeline(null, null)

    expect(timeline).toEqual({ kind: "none" })
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

  it.each([
    ["a missing start date", null, new Date(2024, 0, 1)],
    ["a missing end date", new Date(2024, 0, 1), null],
    ["an inverted range", new Date(2024, 4, 20), new Date(2024, 4, 1)],
  ])("returns null for %s", (_label, startedAt, endedAt) => {
    const duration = getProjectDuration(startedAt, endedAt)

    expect(duration).toBeNull()
  })
})

describe("formatProjectDuration", () => {
  it("counts an in-progress project up to today", () => {
    const label = formatProjectDuration(new Date(2025, 5, 1), null, new Date(2026, 8, 22))

    expect(label).toBe("1 an 3 mois")
  })
})
