import { describe, expect, it } from "vitest"

import { formatSiret } from "./format-siret"

describe("formatSiret", () => {
  it("groups a 14-digit SIRET as 3-3-3-5", () => {
    const result = formatSiret("11122233300044")

    expect(result).toBe("111 222 333 00044")
  })

  it.each([
    ["a 9-digit SIREN", "111222333"],
    ["an empty string", ""],
    ["a non-numeric string", "abc"],
    ["an already formatted SIRET", "111 222 333 00044"],
  ])("returns %s unchanged", (_label, value) => {
    const result = formatSiret(value)

    expect(result).toBe(value)
  })
})
