import { describe, expect, it } from "vitest"

import type { ActionStatus } from "@/generated/prisma/client"

import { rankActions, rankLabel } from "./action-rank"

interface TestAction {
  id: string
  personId: string
  status: ActionStatus
  occurredAt: Date
  createdAt: Date
}

function action(
  overrides: Partial<TestAction> & Pick<TestAction, "id" | "occurredAt">,
): TestAction {
  return { personId: "p1", status: "FAIT", createdAt: new Date(2026, 0, 1), ...overrides }
}

describe("rankActions", () => {
  it("ranks a person's first sent action as the first contact", () => {
    const ranks = rankActions([action({ id: "connection", occurredAt: new Date(2026, 2, 1) })])

    expect(rankLabel(ranks.get("connection") ?? -1)).toBe("Premier contact")
  })

  it("counts only earlier sent actions of the same person", () => {
    const actions = [
      action({ id: "planned-before", status: "A_FAIRE", occurredAt: new Date(2026, 1, 20) }),
      action({ id: "first", occurredAt: new Date(2026, 2, 1) }),
      action({ id: "other-person", personId: "p2", occurredAt: new Date(2026, 2, 2) }),
      action({ id: "ignored", status: "IGNORE", occurredAt: new Date(2026, 2, 3) }),
      action({ id: "third", status: "REPONDU", occurredAt: new Date(2026, 2, 5) }),
    ]

    const ranks = rankActions(actions)

    expect(ranks.get("first")).toBe(0)
    expect(ranks.get("other-person")).toBe(0)
    expect(ranks.get("ignored")).toBe(1)
    expect(rankLabel(ranks.get("third") ?? -1)).toBe("Relance 2")
  })

  it("ranks a planned action after the actions already sent before its date", () => {
    const actions = [
      action({ id: "sent", occurredAt: new Date(2026, 2, 1) }),
      action({ id: "planned", status: "A_FAIRE", occurredAt: new Date(2026, 2, 8) }),
    ]

    const ranks = rankActions(actions)

    expect(rankLabel(ranks.get("planned") ?? -1)).toBe("Relance 1")
  })

  it("keeps a stable rank for two actions at the same time", () => {
    const sameTime = new Date(2026, 2, 1, 9, 0)
    const actions = [
      action({ id: "created-second", occurredAt: sameTime, createdAt: new Date(2026, 1, 2) }),
      action({ id: "created-first", occurredAt: sameTime, createdAt: new Date(2026, 1, 1) }),
    ]

    const ranks = rankActions(actions)

    expect(ranks.get("created-first")).toBe(0)
    expect(ranks.get("created-second")).toBe(1)
  })
})
