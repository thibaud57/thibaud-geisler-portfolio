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

describe("boardColumns", () => {
  it("puts every status in its own column, in the pipeline order", () => {
    const actions = [
      action({ id: "ignored", status: "IGNORE" }),
      action({ id: "todo", status: "A_FAIRE" }),
      action({ id: "done", status: "FAIT" }),
    ]

    const columns = boardColumns(actions)

    expect(Object.keys(columns)).toEqual(["A_FAIRE", "FAIT", "REPONDU", "CONVERTI", "IGNORE"])
    expect(columns.A_FAIRE.map(({ id }) => id)).toEqual(["todo"])
    expect(columns.FAIT.map(({ id }) => id)).toEqual(["done"])
    expect(columns.REPONDU).toEqual([])
    expect(columns.IGNORE.map(({ id }) => id)).toEqual(["ignored"])
  })

  it("sorts each column from the most recent action", () => {
    const actions = [
      action({ id: "old", status: "FAIT", occurredAt: new Date(2026, 8, 1, 9, 0) }),
      action({ id: "recent", status: "FAIT", occurredAt: new Date(2026, 8, 25, 9, 0) }),
      action({ id: "middle", status: "FAIT", occurredAt: new Date(2026, 8, 10, 9, 0) }),
    ]

    const columns = boardColumns(actions)

    expect(columns.FAIT.map(({ id }) => id)).toEqual(["recent", "middle", "old"])
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

    expect(rows.map(({ id }) => id)).toEqual(["yesterday", "planned"])
  })

  it("keeps an action from seven calendar days ago in the 7 days period whatever the time of day", () => {
    const now = new Date(2026, 8, 27, 22, 0).getTime()
    const actions = [
      action({ id: "seven-days-ago", occurredAt: new Date(2026, 8, 20, 9, 0) }),
      action({ id: "eight-days-ago", occurredAt: new Date(2026, 8, 19, 23, 30) }),
    ]

    const rows = actionsInPeriod(actions, "7", now)

    expect(rows.map(({ id }) => id)).toEqual(["seven-days-ago"])
  })
})

describe("statusMoveFrom", () => {
  const previousValue = boardColumns([
    action({ id: "first", occurredAt: new Date(2026, 8, 21, 9, 0) }),
    action({ id: "second", occurredAt: new Date(2026, 8, 20, 9, 0) }),
  ])

  it.each([
    {
      label: "reads a move to another column as a status change",
      kind: "item",
      overContainer: "FAIT",
      expected: { id: "second", status: "FAIT" },
    },
    {
      label: "ignores a move within the same column",
      kind: "item",
      overContainer: "A_FAIRE",
      expected: null,
    },
    {
      label: "never saves a column move",
      kind: "column",
      overContainer: "FAIT",
      expected: null,
    },
  ] as const)("$label", ({ kind, overContainer, expected }) => {
    const move = statusMoveFrom({
      kind,
      activeContainer: "A_FAIRE",
      activeIndex: 1,
      overContainer,
      previousValue,
    })

    expect(move).toEqual(expected)
  })
})
