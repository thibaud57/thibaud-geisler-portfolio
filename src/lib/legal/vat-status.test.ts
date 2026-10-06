import { describe, expect, it } from "vitest"

import { isVatLiable } from "./vat-status"

const now = new Date("2026-06-15T00:00:00.000Z")

describe("isVatLiable", () => {
  it.each([null, undefined])("returns false without a publisher (%s)", (publisher) => {
    const result = isVatLiable(publisher, now)

    expect(result).toBe(false)
  })

  it("returns false while the liability date is empty", () => {
    const result = isVatLiable({ vatLiableSince: null }, now)

    expect(result).toBe(false)
  })

  it("returns true for a past liability date", () => {
    const result = isVatLiable({ vatLiableSince: new Date("2026-01-01T00:00:00.000Z") }, now)

    expect(result).toBe(true)
  })

  it("returns true on the liability day itself", () => {
    const result = isVatLiable({ vatLiableSince: new Date("2026-06-15T00:00:00.000Z") }, now)

    expect(result).toBe(true)
  })

  it("returns false for a future liability date", () => {
    const result = isVatLiable({ vatLiableSince: new Date("2026-12-01T00:00:00.000Z") }, now)

    expect(result).toBe(false)
  })
})
