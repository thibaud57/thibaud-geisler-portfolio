import { describe, expect, it } from "vitest"

import { actionsInPeriod, boardColumns, statusMoveFrom, type BoardRow } from "./action-board"

function action(overrides: Partial<BoardRow> = {}): BoardRow {
  return {
    id: "a1",
    status: "A_FAIRE",
    occurredAt: new Date(2026, 8, 20, 9, 0),
    createdAt: new Date(2026, 8, 1),
    ...overrides,
  }
}

function idsOf(actions: readonly BoardRow[]): string[] {
  return actions.map((row) => row.id)
}

describe("boardColumns", () => {
  it("puts every status in its own column, in the pipeline order", () => {
    const actions = [
      action({ id: "ignored", status: "IGNORE" }),
      action({ id: "todo", status: "A_FAIRE" }),
      action({ id: "done", status: "FAIT" }),
    ]

    const columns = boardColumns(actions)

    expect(Object.keys(columns)).toEqual(["A_FAIRE", "FAIT", "REPONDU", "CONVERTI", "IGNORE"])
    expect(idsOf(columns.A_FAIRE)).toEqual(["todo"])
    expect(idsOf(columns.FAIT)).toEqual(["done"])
    expect(columns.REPONDU).toEqual([])
    expect(idsOf(columns.IGNORE)).toEqual(["ignored"])
  })

  it("sorts each column from the most recent action", () => {
    const actions = [
      action({ id: "old", status: "FAIT", occurredAt: new Date(2026, 8, 1, 9, 0) }),
      action({ id: "recent", status: "FAIT", occurredAt: new Date(2026, 8, 25, 9, 0) }),
      action({ id: "middle", status: "FAIT", occurredAt: new Date(2026, 8, 10, 9, 0) }),
    ]

    const columns = boardColumns(actions)

    expect(idsOf(columns.FAIT)).toEqual(["recent", "middle", "old"])
  })
})

describe("actionsInPeriod", () => {
  it("keeps actions within the period around today", () => {
    const now = new Date(2026, 8, 27, 12, 0).getTime()
    const actions = [
      action({ id: "yesterday", occurredAt: new Date(2026, 8, 26, 9, 0) }),
      action({ id: "two-months-ago", occurredAt: new Date(2026, 6, 27, 9, 0) }),
      action({ id: "planned", occurredAt: new Date(2026, 9, 2, 9, 0) }),
    ]

    const rows = actionsInPeriod(actions, "30", now)

    expect(idsOf(rows)).toEqual(["yesterday", "planned"])
  })

  it("keeps an action from seven calendar days ago in the 7 days period whatever the time of day", () => {
    const now = new Date(2026, 8, 27, 22, 0).getTime()
    const actions = [
      action({ id: "seven-days-ago", occurredAt: new Date(2026, 8, 20, 9, 0) }),
      action({ id: "eight-days-ago", occurredAt: new Date(2026, 8, 19, 23, 30) }),
    ]

    const rows = actionsInPeriod(actions, "7", now)

    expect(idsOf(rows)).toEqual(["seven-days-ago"])
  })
})

describe("statusMoveFrom", () => {
  const previousValue = boardColumns([
    action({ id: "first", occurredAt: new Date(2026, 8, 21, 9, 0) }),
    action({ id: "second", occurredAt: new Date(2026, 8, 20, 9, 0) }),
  ])

  it("reads a move to another column as a status change", () => {
    const move = statusMoveFrom({
      kind: "item",
      activeContainer: "A_FAIRE",
      activeIndex: 1,
      overContainer: "FAIT",
      previousValue,
    })

    expect(move).toEqual({ id: "second", status: "FAIT" })
  })

  it("ignores a move within the same column", () => {
    const move = statusMoveFrom({
      kind: "item",
      activeContainer: "A_FAIRE",
      activeIndex: 1,
      overContainer: "A_FAIRE",
      previousValue,
    })

    expect(move).toBeNull()
  })

  it("never saves a column move", () => {
    const move = statusMoveFrom({
      kind: "column",
      activeContainer: "A_FAIRE",
      activeIndex: 0,
      overContainer: "FAIT",
      previousValue,
    })

    expect(move).toBeNull()
  })
})
