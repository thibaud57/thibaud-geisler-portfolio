import { TZDate } from "@date-fns/tz"

export function timeOf(date: Date): string {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`
}

// Accesseurs locaux : l'instant porte le décalage du navigateur, heure d'été comprise. Une chaîne « AAAA-MM-JJTHH:MM » sans décalage serait lue en UTC par le serveur.
export function toInstant(date: Date | undefined, time: string): string {
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return ""
  const hours = Number(time.slice(0, 2))
  const minutes = Number(time.slice(3, 5))
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).toISOString()
}

// Fuseau fixé : le rendu serveur (UTC) et l'hydratation navigateur doivent produire le même texte.
export const TIME_ZONE = "Europe/Paris"

const SHORT_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: TIME_ZONE,
})

const SHORT_TIME = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
})

export function formatShortDate(date: Date | null): string | null {
  if (!date) return null
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}/${date.getFullYear()}`
}

// Accesseurs locaux, pas toISOString() : le Calendar rend une Date à minuit local, la convertir en
// UTC avant de trancher décale le jour dès que le fuseau est en avance sur UTC (France l'été).
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

export function formatShortInstantDate(date: Date): string
export function formatShortInstantDate(date: Date | null): string | null
export function formatShortInstantDate(date: Date | null): string | null {
  return date ? SHORT_DATE.format(date) : null
}

// Jour lu à Paris et non dans le fuseau du runtime : le serveur tourne en UTC, où minuit à Paris tombe la veille.
export function isSameZonedDay(a: Date, b: Date): boolean {
  return SHORT_DATE.format(a) === SHORT_DATE.format(b)
}

export function formatShortInstantTime(date: Date): string {
  return SHORT_TIME.format(date)
}

export function formatShortDateTime(date: Date): string
export function formatShortDateTime(date: Date | null): string | null
export function formatShortDateTime(date: Date | null): string | null {
  return date ? `${SHORT_DATE.format(date)} · ${SHORT_TIME.format(date)}` : null
}

export const DAY_MS = 86_400_000

// Une date sans heure (@db.Date) arrive à minuit UTC : son jour se lit avec les getters UTC, jamais dans le fuseau du runtime.
export function dateOnlyToLocal(dateOnly: Date): Date {
  return new Date(dateOnly.getUTCFullYear(), dateOnly.getUTCMonth(), dateOnly.getUTCDate())
}

// Colonne date : minuit UTC, relue en UTC pour ne pas reculer d'un jour à l'ouest de Greenwich.
const DATE_ONLY = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

export function formatDateOnly(dateOnly: Date): string {
  return DATE_ONLY.format(dateOnly)
}

// Relu à Paris : une colonne date (minuit UTC) y tombe le même jour, donc dans le même mois.
const MONTH_YEAR = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: TIME_ZONE,
})

export function formatMonthYear(date: Date): string {
  return MONTH_YEAR.format(date)
}

// Minuit de Paris, changement d'heure compris : additionner des multiples de DAY_MS décalerait d'une heure.
export function zonedDayStart(dateOnly: Date, offsetDays = 0): Date {
  return new Date(
    new TZDate(
      dateOnly.getUTCFullYear(),
      dateOnly.getUTCMonth(),
      dateOnly.getUTCDate() + offsetDays,
      0,
      0,
      TIME_ZONE,
    ).getTime(),
  )
}

// Même minuit, mais du jour qu'un instant occupe à Paris : 23 h 45 à Paris est déjà le lendemain en UTC.
export function zonedDayStartOf(instant: Date, offsetDays = 0): Date {
  const day = new TZDate(instant, TIME_ZONE)
  return new Date(
    new TZDate(
      day.getFullYear(),
      day.getMonth(),
      day.getDate() + offsetDays,
      0,
      0,
      TIME_ZONE,
    ).getTime(),
  )
}

// Jours de calendrier, l'heure ignorée : une action de J-7 reste dans « 7 jours » quelle que soit l'heure de consultation. L'arrondi absorbe les journées de 23 h ou 25 h des changements d'heure.
export function calendarDaysBetween(a: Date, b: Date): number {
  const dayA = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const dayB = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round(Math.abs(dayA.getTime() - dayB.getTime()) / DAY_MS)
}

export function isWithinCalendarDays(a: Date, b: Date, days: number): boolean {
  return calendarDaysBetween(a, b) <= days
}
