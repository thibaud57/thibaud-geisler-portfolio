import { describe, expect, it } from "vitest"

import type { ActionChannel, ActionStatus } from "@/generated/prisma/client"

import { actionsForView } from "./action-views"

interface TestAction {
  id: string
  status: ActionStatus
  channel: ActionChannel
  occurredAt: Date
  createdAt: Date
}

function action(overrides: Partial<TestAction> = {}): TestAction {
  return {
    id: "a1",
    status: "A_FAIRE",
    channel: "DM_LINKEDIN",
    occurredAt: new Date(2026, 2, 10, 9, 0),
    createdAt: new Date(2026, 2, 1),
    ...overrides,
  }
}

describe("actionsForView", () => {
  it("keeps only to-do actions in the to-do view, soonest first", () => {
    const actions = [
      action({ id: "later", occurredAt: new Date(2026, 2, 12, 9, 0) }),
      action({ id: "done", status: "FAIT" }),
      action({ id: "sooner", occurredAt: new Date(2026, 2, 11, 9, 0) }),
    ]

    const rows = actionsForView(actions, "a-faire")

    expect(rows.map(({ id }) => id)).toEqual(["sooner", "later"])
  })

  it("keeps only sent LinkedIn connections in the connections view", () => {
    const actions = [
      action({ id: "sent", channel: "CONNEXION_LINKEDIN", status: "FAIT" }),
      action({ id: "planned", channel: "CONNEXION_LINKEDIN", status: "A_FAIRE" }),
      action({ id: "replied", channel: "CONNEXION_LINKEDIN", status: "REPONDU" }),
      action({ id: "dm", channel: "DM_LINKEDIN", status: "FAIT" }),
    ]

    const rows = actionsForView(actions, "connexions")

    expect(rows.map(({ id }) => id)).toEqual(["sent"])
  })

  it("keeps sent LinkedIn messages, emails and texts in the discussions view", () => {
    const actions = (["DM_LINKEDIN", "EMAIL", "SMS_WHATSAPP", "CALL", "CANDIDATURE"] as const).map(
      (channel) => action({ id: channel, channel, status: "FAIT" }),
    )

    const rows = actionsForView(actions, "discussions")

    expect(rows.map(({ id }) => id).sort()).toEqual(["DM_LINKEDIN", "EMAIL", "SMS_WHATSAPP"])
  })

  it.each([
    { view: "connexions", channel: "CONNEXION_LINKEDIN" },
    { view: "discussions", channel: "EMAIL" },
  ] as const)("lists sent actions oldest first in the $view view", ({ view, channel }) => {
    const actions = [
      action({ id: "newer", channel, status: "FAIT", occurredAt: new Date(2026, 2, 5) }),
      action({ id: "older", channel, status: "FAIT", occurredAt: new Date(2026, 2, 1) }),
    ]

    const rows = actionsForView(actions, view)

    expect(rows.map(({ id }) => id)).toEqual(["older", "newer"])
  })

  it("lists sent applications most recent first", () => {
    const actions = [
      action({
        id: "older",
        channel: "CANDIDATURE",
        status: "FAIT",
        occurredAt: new Date(2026, 2, 1),
      }),
      action({
        id: "newer",
        channel: "CANDIDATURE",
        status: "FAIT",
        occurredAt: new Date(2026, 2, 5),
      }),
    ]

    const rows = actionsForView(actions, "candidatures")

    expect(rows.map(({ id }) => id)).toEqual(["newer", "older"])
  })

  it("puts to-do actions first in the journal, then the most recent", () => {
    const actions = [
      action({ id: "old-done", status: "FAIT", occurredAt: new Date(2026, 1, 1) }),
      action({ id: "todo", status: "A_FAIRE", occurredAt: new Date(2026, 3, 1) }),
      action({ id: "recent-done", status: "REPONDU", occurredAt: new Date(2026, 2, 1) }),
    ]

    const rows = actionsForView(actions, "journal")

    expect(rows.map(({ id }) => id)).toEqual(["todo", "recent-done", "old-done"])
  })

  it("breaks journal ties by creation date, newest first", () => {
    const occurredAt = new Date(2026, 2, 1, 9, 0)
    const actions = [
      action({ id: "created-first", status: "FAIT", occurredAt, createdAt: new Date(2026, 2, 1) }),
      action({ id: "created-last", status: "FAIT", occurredAt, createdAt: new Date(2026, 2, 2) }),
    ]

    const rows = actionsForView(actions, "journal")

    expect(rows.map(({ id }) => id)).toEqual(["created-last", "created-first"])
  })
})
