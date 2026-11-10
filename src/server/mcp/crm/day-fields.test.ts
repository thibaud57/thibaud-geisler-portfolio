import { describe, expect, it } from "vitest"

import { instantDate } from "./day-fields"

describe("instantDate", () => {
  const codec = instantDate("Expected an instant.")

  it("reads an instant with its offset", () => {
    expect(codec.parse("2026-11-20T10:00:00+01:00")).toEqual(new Date("2026-11-20T09:00:00Z"))
  })

  it("refuses an instant without offset", () => {
    expect(codec.safeParse("2026-11-20T10:00:00").success).toBe(false)
  })
})
