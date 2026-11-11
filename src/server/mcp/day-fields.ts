import { z } from "zod"

import { dateColumnIsoDay, isoDayToDate, zonedDayStart, zonedIsoDay } from "@/lib/date-time"
import { recordFromKeys } from "@/lib/record-from-keys"

interface DayParams {
  // Jour d'exemple du message d'erreur (sinon celui par défaut de Zod)
  example?: string
  description?: string
}

// `description` sur le schéma d'entrée : posée sur le codec, elle irait en tête du JSON Schema vu par l'agent.
// Un faux jour (`2026-02-31`) est refusé ici : le decode ne lève jamais.
// `z.toJSONSchema(…, { io: "input" })` ignore le côté `Date` : l'agent voit une chaîne `format: date`.
function isoDay({ example, description }: DayParams) {
  const day = z.iso.date(
    example === undefined ? undefined : { error: `Expected a day as YYYY-MM-DD, e.g. ${example}.` },
  )
  return description === undefined ? day : day.describe(description)
}

// Colonne `@db.Date` : minuit UTC, comme `isoDayToDate` et `dateColumnIsoDay`.
export const dateColumnDay = (params: DayParams = {}) =>
  z.codec(isoDay(params), z.date(), { decode: isoDayToDate, encode: dateColumnIsoDay })

// Colonne Timestamptz lue à Paris : un instant UTC relu puis réécrit décalerait la fiche d'un jour.
export const zonedDay = (params: DayParams = {}) =>
  z.codec(isoDay(params), z.date(), {
    decode: (day) => zonedDayStart(isoDayToDate(day)),
    encode: zonedIsoDay,
  })

type DayCodec = z.ZodCodec<z.ZodType<string, string>, z.ZodType<Date>>

const DATE_COLUMN_DAY = dateColumnDay()

type DaysAsStrings<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] extends Date ? string : string | null
}

export function withDays<K extends string, T extends Record<K, Date | null>>(
  row: T,
  keys: readonly K[],
  codec: DayCodec = DATE_COLUMN_DAY,
): DaysAsStrings<T, K> {
  const days = recordFromKeys(keys, (key) => {
    const date = row[key]
    return date && z.encode(codec, date)
  })
  return { ...row, ...days }
}
