import { describe, expect, it } from "vitest"

import { requireOption } from "./is-one-of"

describe("requireOption", () => {
  it("returns a value listed in the options", () => {
    const options = ["new", "fromLead"] as const

    const result = requireOption(options, "fromLead")

    expect(result).toBe("fromLead")
  })

  it("throws on a value outside the options", () => {
    const options = ["new", "fromLead"] as const

    expect(() => requireOption(options, "other")).toThrow("hors options : other")
  })
})
