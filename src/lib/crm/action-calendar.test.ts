import { describe, expect, it } from "vitest"

import type { ActionStatus } from "@/generated/prisma/client"

import { actionEvents } from "./action-calendar"

const LATE_EVENING = new Date("2026-10-15T21:45:00Z")

function action(status: ActionStatus, occurredAt = LATE_EVENING) {
  return { id: status, title: "Relance", status, occurredAt }
}

describe("actionEvents", () => {
  it("lets only a to-do action be dragged", () => {
    const actions = [action("A_FAIRE"), action("FAIT"), action("REPONDU"), action("IGNORE")]

    const events = actionEvents(actions)

    expect(events.map((event) => [event.id, event.draggable])).toEqual([
      ["A_FAIRE", true],
      ["FAIT", false],
      ["REPONDU", false],
      ["IGNORE", false],
    ])
  })

  it("colours each status as the calendar legend", () => {
    const actions = [
      action("A_FAIRE"),
      action("FAIT"),
      action("REPONDU"),
      action("CONVERTI"),
      action("IGNORE"),
    ]

    const events = actionEvents(actions)

    expect(events.map((event) => event.color)).toEqual([
      "var(--color-warning)",
      "var(--color-info)",
      "var(--color-success)",
      "var(--color-success)",
      "var(--color-destructive)",
    ])
  })

  it("spans the whole Paris day of the action, even late in the evening", () => {
    const [event] = actionEvents([action("A_FAIRE")])

    expect(event?.allDay).toBe(true)
    expect(event?.start).toEqual(new Date("2026-10-14T22:00:00Z"))
    expect(event?.end).toEqual(new Date("2026-10-15T22:00:00Z"))
  })
})
