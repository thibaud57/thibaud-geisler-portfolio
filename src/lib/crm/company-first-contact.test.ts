import { describe, expect, it } from "vitest"

import type { ActionStatus, InterviewStatus } from "@/generated/prisma/client"

import { firstContactAtOf } from "./company-first-contact"

function person(
  overrides: {
    metAt?: Date | null
    actions?: { status: ActionStatus; occurredAt: Date }[]
  } = {},
) {
  return { metAt: overrides.metAt ?? null, prospectingActions: overrides.actions ?? [] }
}

function interview(status: InterviewStatus, scheduledAt: Date) {
  return { status, scheduledAt }
}

describe("firstContactAtOf", () => {
  it("keeps the earliest sent action across the company's persons", () => {
    const first = firstContactAtOf(
      [
        person({ actions: [{ status: "FAIT", occurredAt: new Date(2026, 2, 10) }] }),
        person({ actions: [{ status: "REPONDU", occurredAt: new Date(2026, 1, 1) }] }),
      ],
      [],
    )

    expect(first).toEqual(new Date(2026, 1, 1))
  })

  it.each([
    {
      label: "a meeting",
      persons: [person({ metAt: new Date(2025, 10, 6) })],
      interviews: [],
    },
    {
      label: "an interview held on one of its opportunities",
      persons: [],
      interviews: [interview("FAIT", new Date(2025, 10, 6))],
    },
  ])("dates the first contact from $label when no action was sent", ({ persons, interviews }) => {
    const first = firstContactAtOf(persons, interviews)

    expect(first).toEqual(new Date(2025, 10, 6))
  })

  it("keeps the earliest date across actions, meetings and held interviews", () => {
    const first = firstContactAtOf(
      [
        person({
          metAt: new Date(2026, 0, 20),
          actions: [{ status: "FAIT", occurredAt: new Date(2026, 1, 3) }],
        }),
      ],
      [interview("FAIT", new Date(2025, 11, 9))],
    )

    expect(first).toEqual(new Date(2025, 11, 9))
  })

  it.each([
    {
      label: "a to-do action",
      persons: [
        person({ actions: [{ status: "A_FAIRE" as const, occurredAt: new Date(2025, 0, 1) }] }),
      ],
      interviews: [],
    },
    {
      label: "a planned interview",
      persons: [],
      interviews: [interview("PLANIFIE", new Date(2025, 0, 1))],
    },
    {
      label: "a cancelled interview",
      persons: [],
      interviews: [interview("ANNULE", new Date(2025, 0, 1))],
    },
  ])("ignores $label, which is no contact yet", ({ persons, interviews }) => {
    const first = firstContactAtOf(
      [...persons, person({ actions: [{ status: "FAIT", occurredAt: new Date(2026, 2, 10) }] })],
      interviews,
    )

    expect(first).toEqual(new Date(2026, 2, 10))
  })

  it("returns null when the company has no sent action, meeting nor held interview", () => {
    const first = firstContactAtOf(
      [person({ actions: [{ status: "A_FAIRE", occurredAt: new Date(2026, 0, 1) }] }), person()],
      [interview("PLANIFIE", new Date(2026, 0, 1))],
    )

    expect(first).toBeNull()
  })
})
