import { z } from "zod"

import { dateColumnIsoDay, isoDayToDate, zonedDayStart, zonedIsoDay } from "@/lib/date-time"
import { instantOf } from "@/lib/schemas/prospecting-action"
import { recordFromKeys } from "@/lib/record-from-keys"

interface DayParams {
  // Jour d'exemple du message d'erreur ; sans lui, le message par défaut de Zod
  example?: string
  description?: string
}

// La description se pose ici, sur le schéma d'entrée : posée sur le codec, elle passerait en tête de l'objet JSON Schema que voit l'agent.
// Le schéma d'entrée garantit un vrai jour (`2026-02-31` est refusé) : le decode ne lève donc jamais.
// Côté agent, le schéma reste une chaîne `format: date` : `z.toJSONSchema(…, { io: "input" })` ignore le côté `Date`.
function isoDay({ example, description }: DayParams) {
  const day = z.iso.date(
    example === undefined ? undefined : { error: `Expected a day as YYYY-MM-DD, e.g. ${example}.` },
  )
  return description === undefined ? day : day.describe(description)
}

// Colonne `@db.Date` : minuit UTC, comme `isoDayToDate` et `dateColumnIsoDay`.
export const dateColumnDay = (params: DayParams = {}) =>
  z.codec(isoDay(params), z.date(), { decode: isoDayToDate, encode: dateColumnIsoDay })

// Colonne Timestamptz dont le jour se lit à Paris : le jour entre en minuit de Paris et sort en jour de Paris, un instant UTC relu puis réécrit décalerait la fiche d'un jour.
export const zonedDay = (params: DayParams = {}) =>
  z.codec(isoDay(params), z.date(), {
    decode: (day) => zonedDayStart(isoDayToDate(day)),
    encode: zonedIsoDay,
  })

// Instant avec décalage (ISO 8601) lu comme une `Date`.
export const instantDate = (error: string, description?: string) => {
  const instant = instantOf(error)
  return z.codec(description === undefined ? instant : instant.describe(description), z.date(), {
    decode: (value) => new Date(value),
    encode: (date) => date.toISOString(),
  })
}

type DayCodec = z.ZodCodec<z.ZodType<string, string>, z.ZodType<Date>>

const DATE_COLUMN_DAY = dateColumnDay()

type DaysAsStrings<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] extends Date ? string : string | null
}

// Les jours sortent comme ils entrent : le codec qui les lit à l'entrée les écrit à la sortie.
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
