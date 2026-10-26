import { describe, expect, it } from "vitest"
import { formatProjectDuration, getProjectDuration, getProjectTimeline } from "./projects"

describe("getProjectTimeline", () => {
  it.each([
    [
      "a project with a start date and no end date as ongoing",
      new Date("2023-06-01"),
      null,
      { kind: "ongoing", start: new Date("2023-06-01") },
    ],
    [
      "a project with both dates as ended",
      new Date("2022-03-01"),
      new Date("2024-11-15"),
      { kind: "ended", start: new Date("2022-03-01"), end: new Date("2024-11-15") },
    ],
    ["a project without a start date as having no timeline", null, null, { kind: "none" }],
  ])("reports %s", (_label, startedAt, endedAt, expected) => {
    const timeline = getProjectTimeline(startedAt, endedAt)

    expect(timeline).toEqual(expected)
  })
})

describe("getProjectDuration", () => {
  it.each([
    [
      "both the start and the end months",
      new Date("2026-01-05"),
      new Date("2026-06-20"),
      { years: 0, months: 6 },
    ],
    [
      "a full calendar year as one year",
      new Date("2026-01-01"),
      new Date("2026-12-31"),
      { years: 1, months: 0 },
    ],
    [
      "a span over several years in years and months",
      new Date("2022-01-10"),
      new Date("2025-03-01"),
      { years: 3, months: 3 },
    ],
    [
      "a project within a single month as one month",
      new Date("2024-05-03"),
      new Date("2024-05-20"),
      { years: 0, months: 1 },
    ],
  ])("counts %s", (_label, startedAt, endedAt, expected) => {
    const duration = getProjectDuration(startedAt, endedAt)

    expect(duration).toEqual(expected)
  })

  it.each([
    ["a missing start date", null, new Date("2024-01-01")],
    ["a missing end date", new Date("2024-01-01"), null],
    ["an inverted range", new Date("2024-05-20"), new Date("2024-05-01")],
  ])("returns null for %s", (_label, startedAt, endedAt) => {
    const duration = getProjectDuration(startedAt, endedAt)

    expect(duration).toBeNull()
  })
})

describe("formatProjectDuration", () => {
  it("counts an in-progress project up to today", () => {
    const label = formatProjectDuration(new Date("2025-06-01"), null, new Date("2026-09-22"))

    expect(label).toBe("1 an 4 mois")
  })
})
