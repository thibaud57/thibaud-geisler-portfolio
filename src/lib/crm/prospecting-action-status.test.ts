import { describe, expect, it } from "vitest"

import { applyStatusRules, type ActionTiming } from "./prospecting-action-status"

const NOW = new Date("2026-03-11T13:30:00Z")
const MONDAY = new Date("2026-03-09T08:00:00Z")
const TUESDAY_EVENING = new Date("2026-03-10T17:00:00Z")
const REPLY = "Merci, on peut en parler jeudi."

function timing(overrides: Partial<ActionTiming> = {}): ActionTiming {
  return { status: "A_FAIRE", occurredAt: MONDAY, respondedAt: null, reply: null, ...overrides }
}

describe("applyStatusRules", () => {
  it("stamps the sending time when an action leaves to do", () => {
    const result = applyStatusRules(timing(), timing({ status: "FAIT" }), NOW)

    expect(result.occurredAt).toEqual(NOW)
  })

  it("stamps the sending time when the planned day comes back without its time", () => {
    const mondayMidnightInParis = new Date("2026-03-08T23:00:00Z")

    const result = applyStatusRules(
      timing(),
      timing({ status: "FAIT", occurredAt: mondayMidnightInParis }),
      NOW,
    )

    expect(result.occurredAt).toEqual(NOW)
  })

  it("keeps a date changed in the same edit that marks it done", () => {
    const result = applyStatusRules(
      timing(),
      timing({ status: "FAIT", occurredAt: TUESDAY_EVENING }),
      NOW,
    )

    expect(result.occurredAt).toEqual(TUESDAY_EVENING)
  })

  it("keeps the stored sending time when a sent action is saved again on the same day", () => {
    const tuesdayMidnightInParis = new Date("2026-03-09T23:00:00Z")

    const result = applyStatusRules(
      timing({ status: "FAIT", occurredAt: TUESDAY_EVENING }),
      timing({ status: "FAIT", occurredAt: tuesdayMidnightInParis }),
      NOW,
    )

    expect(result.occurredAt).toEqual(TUESDAY_EVENING)
  })

  it("drops the sending time when a sent action goes back to to-do", () => {
    const tuesdayMidnightInParis = new Date("2026-03-09T23:00:00Z")

    const result = applyStatusRules(
      timing({ status: "FAIT", occurredAt: TUESDAY_EVENING }),
      timing({ status: "A_FAIRE", occurredAt: tuesdayMidnightInParis }),
      NOW,
    )

    expect(result.occurredAt).toEqual(tuesdayMidnightInParis)
  })

  it("moves a sent action to the new day when its day changes", () => {
    const wednesdayMidnightInParis = new Date("2026-03-10T23:00:00Z")

    const result = applyStatusRules(
      timing({ status: "FAIT", occurredAt: TUESDAY_EVENING }),
      timing({ status: "FAIT", occurredAt: wednesdayMidnightInParis }),
      NOW,
    )

    expect(result.occurredAt).toEqual(wednesdayMidnightInParis)
  })

  it.each(["REPONDU", "CONVERTI"] as const)(
    "stamps the reply time when an action becomes replied or converted (%s)",
    (status) => {
      const result = applyStatusRules(timing({ status: "FAIT" }), timing({ status }), NOW)

      expect(result.respondedAt).toEqual(NOW)
    },
  )

  it("keeps a submitted reply time", () => {
    const result = applyStatusRules(
      timing({ status: "FAIT" }),
      timing({ status: "REPONDU", respondedAt: TUESDAY_EVENING }),
      NOW,
    )

    expect(result.respondedAt).toEqual(TUESDAY_EVENING)
  })

  it("keeps the reply time when a replied action becomes converted", () => {
    const result = applyStatusRules(
      timing({ status: "REPONDU", respondedAt: TUESDAY_EVENING }),
      timing({ status: "CONVERTI" }),
      NOW,
    )

    expect(result.respondedAt).toEqual(TUESDAY_EVENING)
  })

  it.each(["A_FAIRE", "FAIT", "IGNORE"] as const)(
    "clears the reply time when an action goes back to to do, done or ignored (%s)",
    (status) => {
      const result = applyStatusRules(
        timing({ status: "REPONDU", respondedAt: TUESDAY_EVENING }),
        timing({ status, respondedAt: TUESDAY_EVENING }),
        NOW,
      )

      expect(result.respondedAt).toBeNull()
    },
  )

  it.each(["REPONDU", "CONVERTI"] as const)(
    "keeps the submitted reply when an action is replied or converted (%s)",
    (status) => {
      const result = applyStatusRules(
        timing({ status: "FAIT" }),
        timing({ status, reply: REPLY }),
        NOW,
      )

      expect(result.reply).toBe(REPLY)
    },
  )

  it.each(["A_FAIRE", "FAIT", "IGNORE"] as const)(
    "clears the reply when an action goes back to to do, done or ignored (%s)",
    (status) => {
      const result = applyStatusRules(
        timing({ status: "REPONDU", reply: REPLY }),
        timing({ status, reply: REPLY }),
        NOW,
      )

      expect(result.reply).toBeNull()
    },
  )

  it("does not restore a stored reply that the form cleared", () => {
    const result = applyStatusRules(
      timing({ status: "REPONDU", reply: REPLY }),
      timing({ status: "REPONDU", reply: null }),
      NOW,
    )

    expect(result.reply).toBeNull()
  })
})
