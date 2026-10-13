import { describe, expect, it } from "vitest"

import type { ActionChannel, ActionStatus } from "@/generated/prisma/client"

import { countWeek, weekBounds, type CounterSources } from "./review-counters"

// Semaine close le vendredi 25 septembre 2026 (heure d'été de Paris).
const BOUNDS = {
  start: new Date("2026-09-18T22:00:00.000Z"),
  end: new Date("2026-09-25T22:00:00.000Z"),
}
const IN_WEEK = new Date("2026-09-23T10:00:00.000Z")
const BEFORE = new Date("2026-09-18T10:00:00.000Z")
const NOW = new Date("2026-09-25T12:00:00.000Z").getTime()

function action(
  channel: ActionChannel,
  status: ActionStatus,
  occurredAt: Date,
  respondedAt: Date | null = null,
) {
  return { channel, status, occurredAt, respondedAt }
}

function sources(overrides: Partial<CounterSources> = {}): CounterSources {
  return { actions: [], interviews: [], leads: [], ...overrides }
}

type LeadSource = CounterSources["leads"][number]

function lead(status: LeadSource["status"], overrides: Partial<LeadSource> = {}): LeadSource {
  return { status, opportunities: [], interviews: [], optedOutAt: null, ...overrides }
}

describe("countWeek", () => {
  it("counts sent connections and messages by their sending date", () => {
    const counts = countWeek(
      sources({
        actions: [
          action("CONNEXION_LINKEDIN", "FAIT", IN_WEEK),
          action("CONNEXION_LINKEDIN", "REPONDU", IN_WEEK, IN_WEEK),
          action("CONNEXION_LINKEDIN", "A_FAIRE", IN_WEEK),
          action("CONNEXION_LINKEDIN", "FAIT", BEFORE),
          action("DM_LINKEDIN", "FAIT", IN_WEEK),
          action("EMAIL", "CONVERTI", IN_WEEK, IN_WEEK),
          action("CALL", "FAIT", IN_WEEK),
        ],
      }),
      BOUNDS,
      NOW,
    )

    expect(counts.connectionsSent).toBe(2)
    expect(counts.messagesSent).toBe(2)
  })

  it("counts acceptances, replies and booked meetings in the week the reply arrived", () => {
    const counts = countWeek(
      sources({
        actions: [
          action("CONNEXION_LINKEDIN", "REPONDU", BEFORE, IN_WEEK),
          action("DM_LINKEDIN", "REPONDU", BEFORE, IN_WEEK),
          action("SMS_WHATSAPP", "CONVERTI", BEFORE, IN_WEEK),
          action("EMAIL", "REPONDU", IN_WEEK, BEFORE),
        ],
      }),
      BOUNDS,
      NOW,
    )

    expect(counts.connectionsAccepted).toBe(1)
    expect(counts.conversationsEngaged).toBe(2)
    expect(counts.meetingsBooked).toBe(1)
    expect(counts.messagesSent).toBe(1)
  })

  it("counts interviews held in the week from the interview records", () => {
    const counts = countWeek(
      sources({
        interviews: [
          { status: "FAIT", scheduledAt: IN_WEEK },
          { status: "PLANIFIE", scheduledAt: IN_WEEK },
          { status: "ANNULE", scheduledAt: IN_WEEK },
          { status: "FAIT", scheduledAt: BEFORE },
        ],
      }),
      BOUNDS,
      NOW,
    )

    expect(counts.interviewsHeld).toBe(1)
  })

  it("counts active leads by their displayed status, opted-out leads excluded", () => {
    const counts = countWeek(
      sources({
        leads: [
          lead("SUSPECT"),
          lead("DISCUSSION"),
          lead("NOUVEAU", {
            interviews: [{ status: "PLANIFIE", scheduledAt: new Date("2026-09-30T10:00:00.000Z") }],
          }),
          lead("NOUVEAU"),
          lead("DISCUSSION", { opportunities: [{ status: "ACCEPTEE" }] }),
          lead("SUSPECT", { optedOutAt: new Date("2026-09-01T10:00:00.000Z") }),
        ],
      }),
      BOUNDS,
      NOW,
    )

    expect(counts.activeLeads).toBe(3)
  })
})

describe("weekBounds", () => {
  it.each([
    {
      label: "in summer time",
      date: Date.UTC(2026, 8, 25),
      start: "2026-09-18T22:00:00.000Z",
      end: "2026-09-25T22:00:00.000Z",
    },
    {
      label: "across the clock change",
      date: Date.UTC(2026, 9, 30),
      start: "2026-10-23T22:00:00.000Z",
      end: "2026-10-30T23:00:00.000Z",
    },
  ])("keeps the week from Saturday to Friday in Paris time $label", ({ date, start, end }) => {
    const bounds = weekBounds(new Date(date))

    expect(bounds.start.toISOString()).toBe(start)
    expect(bounds.end.toISOString()).toBe(end)
  })
})
