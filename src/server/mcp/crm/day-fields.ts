import { dateColumnIsoDay, isoDayToDate } from "@/lib/date-time"
import { recordFromKeys } from "@/lib/record-from-keys"
import { mapDefined } from "@/lib/utils"

// Le lecteur par défaut est celui des colonnes `@db.Date` (minuit UTC) : une colonne Timestamptz passe le sien, au fuseau de Paris.
export const toDay = (
  day: string | undefined,
  convert: (day: string) => Date = isoDayToDate,
): Date | undefined => mapDefined(day, convert)

type DaysAsStrings<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] extends Date ? string : string | null
}

// Les jours sortent comme ils entrent : un instant relu puis réécrit décalerait la fiche d'un jour.
export function withDays<K extends string, T extends Record<K, Date | null>>(
  row: T,
  keys: readonly K[],
  format: (date: Date) => string = dateColumnIsoDay,
): DaysAsStrings<T, K> {
  const days = recordFromKeys(keys, (key) => {
    const date = row[key]
    return date && format(date)
  })
  return { ...row, ...days }
}
