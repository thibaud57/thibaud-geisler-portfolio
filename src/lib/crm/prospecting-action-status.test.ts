import { describe, expect, it } from "vitest"

import { ActionChannel } from "@/generated/prisma/browser"

import {
  ALLOWED_STATUSES,
  applyStatusRules,
  hasResponseDate,
  isContactMade,
  isStatusAllowed,
  isTransitionAllowed,
  statusForChannel,
  type ActionTiming,
} from "./prospecting-action-status"

const NOW = new Date("2026-03-11T13:30:00Z")
const MONDAY = new Date("2026-03-09T08:00:00Z")
const TUESDAY_EVENING = new Date("2026-03-10T17:00:00Z")
const REPLY = "Merci, on peut en parler jeudi."

function timing(overrides: Partial<ActionTiming> = {}): ActionTiming {
  return {
    channel: "DM_LINKEDIN",
    status: "A_FAIRE",
    occurredAt: MONDAY,
    respondedAt: null,
    reply: null,
    ...overrides,
  }
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

  it("keeps the response date and the reply of a refused message", () => {
    const result = applyStatusRules(
      timing({ status: "FAIT" }),
      timing({ status: "REFUSE", reply: REPLY }),
      NOW,
    )

    expect(result).toMatchObject({ respondedAt: NOW, reply: REPLY })
  })

  it("keeps the response date entered on an action created refused", () => {
    const result = applyStatusRules(
      null,
      timing({ status: "REFUSE", respondedAt: TUESDAY_EVENING }),
      NOW,
    )

    expect(result.respondedAt).toEqual(TUESDAY_EVENING)
  })

  it.each(["A_FAIRE", "FAIT", "CONVERTI", "IGNORE"] as const)(
    "clears the response date and the reply of a call in status %s",
    (status) => {
      const result = applyStatusRules(
        timing({ channel: "CALL", status: "FAIT" }),
        timing({ channel: "CALL", status, respondedAt: NOW, reply: REPLY }),
        NOW,
      )

      expect(result).toMatchObject({ respondedAt: null, reply: null })
    },
  )

  it("keeps the planned day when a call leaves to do", () => {
    const plannedFriday = new Date("2026-03-05T23:00:00Z")

    const result = applyStatusRules(
      timing({ channel: "CALL", occurredAt: plannedFriday }),
      timing({ channel: "CALL", status: "CONVERTI", occurredAt: plannedFriday }),
      NOW,
    )

    expect(result.occurredAt).toEqual(plannedFriday)
  })

  it("allows creating an action already ignored", () => {
    const result = applyStatusRules(null, timing({ status: "IGNORE" }), NOW)

    expect(result.status).toBe("IGNORE")
  })
})

describe("isStatusAllowed", () => {
  const allowedPairs = Object.values(ActionChannel).flatMap((channel) =>
    ALLOWED_STATUSES[channel].map((status) => [channel, status] as const),
  )

  it.each(allowedPairs)("allows %s to be %s", (channel, status) => {
    const allowed = isStatusAllowed(channel, status)

    expect(allowed).toBe(true)
  })

  it.each([
    ["CALL", "REPONDU"],
    ["CALL", "REFUSE"],
    ["CONNEXION_LINKEDIN", "CONVERTI"],
    ["CONNEXION_LINKEDIN", "REFUSE"],
  ] as const)("forbids %s to be %s", (channel, status) => {
    const allowed = isStatusAllowed(channel, status)

    expect(allowed).toBe(false)
  })
})

describe("statusForChannel", () => {
  it.each([
    { channel: "CALL", status: "REPONDU", expected: "FAIT" },
    { channel: "EMAIL", status: "REFUSE", expected: "REFUSE" },
  ] as const)(
    "falls back to done when the channel forbids the status ($channel, $status)",
    ({ channel, status, expected }) => {
      const result = statusForChannel(channel, status)

      expect(result).toBe(expected)
    },
  )
})

describe("hasResponseDate", () => {
  it.each([
    { channel: "DM_LINKEDIN", status: "REPONDU", expected: true },
    { channel: "EMAIL", status: "REFUSE", expected: true },
    { channel: "DM_LINKEDIN", status: "FAIT", expected: false },
    { channel: "CALL", status: "CONVERTI", expected: false },
  ] as const)(
    "tells whether a response date applies ($channel, $status)",
    ({ channel, status, expected }) => {
      const result = hasResponseDate(channel, status)

      expect(result).toBe(expected)
    },
  )
})

describe("isTransitionAllowed", () => {
  it.each([
    {
      label: "refuses to ignore a message that was never sent",
      channel: "DM_LINKEDIN",
      expected: false,
    },
    {
      label: "allows ignoring a planned call that did not take place",
      channel: "CALL",
      expected: true,
    },
  ] as const)("$label", ({ channel, expected }) => {
    const allowed = isTransitionAllowed(channel, "A_FAIRE", "IGNORE")

    expect(allowed).toBe(expected)
  })
})

describe("isContactMade", () => {
  it.each([
    { channel: "CALL", status: "IGNORE", expected: false },
    { channel: "DM_LINKEDIN", status: "IGNORE", expected: true },
    { channel: "CALL", status: "A_FAIRE", expected: false },
  ] as const)(
    "does not count a call that did not take place as a contact ($channel, $status)",
    ({ channel, status, expected }) => {
      const result = isContactMade(channel, status)

      expect(result).toBe(expected)
    },
  )
})
