import { describe, expect, it } from "vitest"

import {
  COMPANY_RELATION_DISPLAY_STATUSES,
  lastInteractionAtOf,
  relationDisplayStatus,
  type InteractionSources,
} from "./company-relation-status"

const NOW = new Date("2026-11-18T12:00:00Z")

function sources(overrides: Partial<InteractionSources> = {}): InteractionSources {
  return { actions: [], metAts: [], interviews: [], projects: [], opportunities: [], ...overrides }
}

describe("lastInteractionAtOf", () => {
  it("takes the latest of contacts, replies, meetings and held interviews", () => {
    const last = lastInteractionAtOf(
      sources({
        actions: [
          {
            channel: "DM_LINKEDIN",
            status: "REPONDU",
            occurredAt: new Date("2026-03-03T09:00:00Z"),
            respondedAt: new Date("2026-04-10T09:00:00Z"),
          },
        ],
        metAts: [new Date("2026-05-02T00:00:00Z")],
        interviews: [{ status: "FAIT", scheduledAt: new Date("2026-06-15T09:00:00Z") }],
      }),
      NOW,
    )

    expect(last).toEqual(new Date("2026-06-15T09:00:00Z"))
  })

  it("counts an ongoing client project and a running accepted mission as today", () => {
    const ongoingProject = lastInteractionAtOf(
      sources({
        projects: [{ type: "CLIENT", startedAt: new Date("2026-01-01T00:00:00Z"), endedAt: null }],
      }),
      NOW,
    )
    const projectWithPlannedEnd = lastInteractionAtOf(
      sources({
        projects: [
          {
            type: "CLIENT",
            startedAt: new Date("2026-01-01T00:00:00Z"),
            endedAt: new Date("2027-03-31T00:00:00Z"),
          },
        ],
      }),
      NOW,
    )
    const runningMission = lastInteractionAtOf(
      sources({
        opportunities: [
          {
            status: "ACCEPTEE",
            startMonth: new Date("2026-06-01T00:00:00Z"),
            durationMonths: 12,
          },
        ],
      }),
      NOW,
    )

    expect([ongoingProject, projectWithPlannedEnd, runningMission]).toEqual([NOW, NOW, NOW])
  })

  it("dates a finished mission at its end and a mission without duration at its start", () => {
    const finished = lastInteractionAtOf(
      sources({
        opportunities: [
          {
            status: "ACCEPTEE",
            startMonth: new Date("2025-01-01T00:00:00Z"),
            durationMonths: 6,
          },
        ],
      }),
      NOW,
    )
    const withoutDuration = lastInteractionAtOf(
      sources({
        opportunities: [
          {
            status: "ACCEPTEE",
            startMonth: new Date("2025-03-01T00:00:00Z"),
            durationMonths: null,
          },
        ],
      }),
      NOW,
    )

    expect([finished, withoutDuration]).toEqual([
      new Date("2025-07-01T00:00:00Z"),
      new Date("2025-03-01T00:00:00Z"),
    ])
  })

  it("dates a finished client project at its end", () => {
    const last = lastInteractionAtOf(
      sources({
        projects: [
          {
            type: "CLIENT",
            startedAt: new Date("2025-01-01T00:00:00Z"),
            endedAt: new Date("2025-09-30T00:00:00Z"),
          },
        ],
      }),
      NOW,
    )

    expect(last).toEqual(new Date("2025-09-30T00:00:00Z"))
  })

  it("ignores personal projects, planned interviews, actions to do, calls not held and future dates", () => {
    const last = lastInteractionAtOf(
      sources({
        projects: [
          { type: "PERSONAL", startedAt: new Date("2026-01-01T00:00:00Z"), endedAt: null },
          { type: "CLIENT", startedAt: new Date("2026-12-01T00:00:00Z"), endedAt: null },
        ],
        interviews: [{ status: "PLANIFIE", scheduledAt: new Date("2026-05-01T09:00:00Z") }],
        actions: [
          {
            channel: "EMAIL",
            status: "A_FAIRE",
            occurredAt: new Date("2026-05-02T09:00:00Z"),
            respondedAt: null,
          },
          {
            channel: "CALL",
            status: "IGNORE",
            occurredAt: new Date("2026-05-03T09:00:00Z"),
            respondedAt: null,
          },
          {
            channel: "DM_LINKEDIN",
            status: "REPONDU",
            occurredAt: new Date("2026-12-01T09:00:00Z"),
            respondedAt: new Date("2026-12-01T09:00:00Z"),
          },
        ],
      }),
      NOW,
    )

    expect(last).toBeNull()
  })

  it.each([
    {
      label: "ignores an accepted mission without start month",
      opportunities: [{ status: "ACCEPTEE", startMonth: null, durationMonths: 6 }],
    },
    {
      label: "ignores an accepted mission that has not started yet and an opportunity not accepted",
      opportunities: [
        { status: "ACCEPTEE", startMonth: new Date("2026-12-01T00:00:00Z"), durationMonths: 6 },
        { status: "EN_PROCESS", startMonth: new Date("2026-01-01T00:00:00Z"), durationMonths: 6 },
      ],
    },
  ] as const)("$label", ({ opportunities }) => {
    const last = lastInteractionAtOf(sources({ opportunities }), NOW)

    expect(last).toBeNull()
  })
})

describe("relationDisplayStatus", () => {
  it("stays active on the exact twelve-month day and turns dormant the day after", () => {
    const onTheDay = new Date("2025-11-18T08:00:00Z")
    const dayBefore = new Date("2025-11-17T08:00:00Z")

    expect([
      relationDisplayStatus("ACTIVE", onTheDay, NOW),
      relationDisplayStatus("ACTIVE", dayBefore, NOW),
    ]).toEqual(["ACTIVE", "DORMANTE"])
  })

  it.each([
    {
      label: "keeps an archived company archived whatever its activity",
      stored: "ARCHIVEE",
      lastInteractionAt: NOW,
    },
    {
      label: "keeps a company without any interaction active",
      stored: "ACTIVE",
      lastInteractionAt: null,
    },
  ] as const)("$label", ({ stored, lastInteractionAt }) => {
    const status = relationDisplayStatus(stored, lastInteractionAt, NOW)

    expect(status).toBe(stored)
  })
})

describe("COMPANY_RELATION_DISPLAY_STATUSES", () => {
  it("lists the stored statuses and the derived one in display order", () => {
    expect(COMPANY_RELATION_DISPLAY_STATUSES).toEqual(["ACTIVE", "DORMANTE", "ARCHIVEE"])
  })
})
