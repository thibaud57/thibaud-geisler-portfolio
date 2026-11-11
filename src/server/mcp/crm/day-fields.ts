import { z } from "zod"

import { toMonthValue } from "@/lib/crm/opportunities"
import { zonedIsoInstant } from "@/lib/date-time"
import { instantOf } from "@/lib/schemas/prospecting-action"
import { withDays, zonedDay } from "@/server/mcp/day-fields"

// Instant avec décalage (ISO 8601) lu comme une `Date`.
export const instantDate = (error: string, description?: string) => {
  const instant = instantOf(error)
  return z.codec(description === undefined ? instant : instant.describe(description), z.date(), {
    decode: (value) => new Date(value),
    encode: zonedIsoInstant,
  })
}

export const ZONED_DAY = zonedDay()

// Le mois sort comme il entre : un instant relu puis réécrit serait refusé par le schéma d'entrée.
export const withMonth = <T extends { startMonth: Date | null }>(row: T) => ({
  ...row,
  startMonth: row.startMonth && toMonthValue(row.startMonth),
})

export const withSignalDay = <T extends { occurredOn: Date }>(signal: T) =>
  withDays(signal, ["occurredOn"])
