import { describe, expect, it } from "vitest"

import { isOptOutOver, isRetentionOver, retentionEndOf } from "./person-retention"

describe("retentionEndOf", () => {
  it.each([
    {
      label: "when it never replied",
      lastReplyAt: null,
      expected: new Date(2028, 4, 10),
    },
    {
      label: "when its reply predates it",
      lastReplyAt: new Date(2024, 0, 5),
      expected: new Date(2028, 4, 10),
    },
    {
      label: "after its last reply",
      lastReplyAt: new Date(2026, 1, 3),
      expected: new Date(2029, 1, 3),
    },
  ])("keeps an active person three years $label", ({ lastReplyAt, expected }) => {
    const end = retentionEndOf({ createdAt: new Date(2025, 4, 10), lastReplyAt, optedOutAt: null })

    expect(end).toEqual(expected)
  })

  it("keeps an opted-out person three years after the stop", () => {
    const person = {
      createdAt: new Date(2020, 0, 1),
      lastReplyAt: new Date(2026, 5, 1),
      optedOutAt: new Date(2023, 8, 15),
    }

    const end = retentionEndOf(person)

    expect(end).toEqual(new Date(2026, 8, 15))
  })
})

describe("isRetentionOver", () => {
  const person = { createdAt: new Date(2025, 4, 10), lastReplyAt: null, optedOutAt: null }

  it.each([
    {
      label: "keeps an active person before the end of its retention",
      now: new Date(2028, 4, 9),
      expected: false,
    },
    {
      label: "releases an active person once its retention is over",
      now: new Date(2028, 4, 11),
      expected: true,
    },
  ])("$label", ({ now, expected }) => {
    const over = isRetentionOver(person, now)

    expect(over).toBe(expected)
  })

  it("releases an opted-out person three years after the stop, whatever its creation date", () => {
    const optedOut = {
      ...person,
      createdAt: new Date(2026, 0, 1),
      optedOutAt: new Date(2023, 8, 15),
    }

    const over = isRetentionOver(optedOut, new Date(2026, 8, 27))

    expect(over).toBe(true)
  })
})

describe("isOptOutOver", () => {
  const optedOutAt = new Date(2023, 8, 15)

  it.each([
    {
      label: "holds an opposition until its third anniversary",
      now: new Date(2026, 8, 14),
      expected: false,
    },
    {
      label: "holds an opposition on the day of its third anniversary",
      now: new Date(2026, 8, 15),
      expected: false,
    },
    {
      label: "releases an opposition once its third anniversary is past",
      now: new Date(2026, 8, 15, 0, 0, 1),
      expected: true,
    },
  ])("$label", ({ now, expected }) => {
    const over = isOptOutOver(optedOutAt, now)

    expect(over).toBe(expected)
  })
})
