import { describe, expect, it } from "vitest"

import { sortZones } from "@/lib/zones"

describe("sortZones", () => {
  it("sorts zones into the canonical order regardless of submission order", () => {
    const sorted = sortZones(["MONDE", "LUXEMBOURG", "PARIS", "GRAND_EST"])

    expect(sorted).toEqual(["GRAND_EST", "PARIS", "LUXEMBOURG", "MONDE"])
  })
})
