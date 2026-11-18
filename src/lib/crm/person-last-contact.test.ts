import { describe, expect, it } from "vitest"

import type { ActionChannel, ActionStatus } from "@/generated/prisma/client"

import { lastContactAtOf } from "./person-last-contact"

const NOW = new Date(2026, 6, 15)

function action(
  channel: ActionChannel,
  status: ActionStatus,
  occurredAt: Date,
  respondedAt: Date | null = null,
) {
  return { channel, status, occurredAt, respondedAt }
}

describe("lastContactAtOf", () => {
  it("takes the latest of replies, held calls and held interviews", () => {
    const actions = [
      action("DM_LINKEDIN", "REPONDU", new Date(2026, 1, 20), new Date(2026, 2, 2)),
      action("CALL", "FAIT", new Date(2026, 4, 10)),
    ]
    const interviews = [{ status: "FAIT" as const, scheduledAt: new Date(2026, 5, 15) }]

    const lastContact = lastContactAtOf(actions, interviews, NOW)

    expect(lastContact).toEqual(new Date(2026, 5, 15))
  })

  it("ignores sent messages without reply, calls not held and future dates", () => {
    const actions = [
      action("DM_LINKEDIN", "FAIT", new Date(2026, 6, 1)),
      action("CALL", "IGNORE", new Date(2026, 6, 5)),
      action("EMAIL", "REPONDU", new Date(2026, 1, 20), new Date(2026, 2, 2)),
      action("EMAIL", "REPONDU", new Date(2026, 6, 1), new Date(2026, 6, 20)),
    ]
    const interviews = [{ status: "FAIT" as const, scheduledAt: new Date(2026, 6, 20) }]

    const lastContact = lastContactAtOf(actions, interviews, NOW)

    expect(lastContact).toEqual(new Date(2026, 2, 2))
  })

  it("returns null without any contact from the person", () => {
    const actions = [action("DM_LINKEDIN", "FAIT", new Date(2026, 6, 1))]
    const interviews = [{ status: "PLANIFIE" as const, scheduledAt: new Date(2026, 6, 10) }]

    const lastContact = lastContactAtOf(actions, interviews, NOW)

    expect(lastContact).toBeNull()
  })
})
