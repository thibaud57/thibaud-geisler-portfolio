import { describe, expect, it } from "vitest"

import { dateColumnDay } from "@/server/mcp/day-fields"
import { instantDate } from "./day-fields"
import { dateRange } from "./date-range"

interface Bounds {
  from?: string
  to?: string
}

// Pour l'instant, 10:00+01:00 précède 09:30Z : une comparaison de chaînes inverserait le verdict.
describe.each([
  [
    "instant",
    instantDate("Expected an instant."),
    "2026-11-20T10:00:00+01:00",
    "2026-11-20T09:30:00Z",
  ],
  ["day", dateColumnDay(), "2026-11-20", "2026-11-21"],
] as const)("dateRange on an %s bound", (_name, bound, earlier, later) => {
  const schema = dateRange(bound)

  it.each<[string, Bounds, boolean]>([
    ["refuses from after to", { from: later, to: earlier }, false],
    ["accepts from before to", { from: earlier, to: later }, true],
    ["accepts equal bounds", { from: earlier, to: earlier }, true],
    ["accepts a missing to", { from: earlier }, true],
    ["accepts a missing from", { to: later }, true],
    ["accepts no bound", {}, true],
  ])("%s", (_label, range, accepted) => {
    expect(schema.safeParse(range).success).toBe(accepted)
  })
})
