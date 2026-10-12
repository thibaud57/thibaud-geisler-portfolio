import { describe, expect, it } from "vitest"

import { isRetentionOver, retentionEndOf } from "./person-retention"

describe("retentionEndOf", () => {
  it("keeps an active person three years after its creation when it never replied", () => {
    const end = retentionEndOf({
      createdAt: new Date(2025, 4, 10),
      lastReplyAt: null,
      optedOutAt: null,
    })

    expect(end).toEqual(new Date(2028, 4, 10))
  })

  it("keeps an active person three years after its creation when its reply predates it", () => {
    const end = retentionEndOf({
      createdAt: new Date(2025, 4, 10),
      lastReplyAt: new Date(2024, 0, 5),
      optedOutAt: null,
    })

    expect(end).toEqual(new Date(2028, 4, 10))
  })

  it("keeps an active person three years after its last reply", () => {
    const end = retentionEndOf({
      createdAt: new Date(2025, 4, 10),
      lastReplyAt: new Date(2026, 1, 3),
      optedOutAt: null,
    })

    expect(end).toEqual(new Date(2029, 1, 3))
  })

  it("keeps an opted-out person three years after the stop", () => {
    const person = {
      createdAt: new Date(2020, 0, 1),
      lastReplyAt: new Date(2026, 5, 1),
      optedOutAt: new Date(2023, 8, 15),
    }

    const end = retentionEndOf(person)

    expect(end).toEqual(new Date(2026, 8, 15))
    expect(isRetentionOver(person, new Date(2026, 8, 27))).toBe(true)
  })
})
