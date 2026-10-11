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

const SHORT_DATE_TIME = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
})

const SHORT_TIME = new Intl.DateTimeFormat("fr-FR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: TIME_ZONE,
})

export function formatShortInstantDate(date: Date | null): string | null {
  return date ? SHORT_DATE.format(date) : null
}

export function formatShortInstantTime(date: Date): string {
  return SHORT_TIME.format(date)
}

export function formatShortDateTime(date: Date): string
export function formatShortDateTime(date: Date | null): string | null
export function formatShortDateTime(date: Date | null): string | null {
  return date ? SHORT_DATE_TIME.format(date).replace(",", "") : null
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

// Jours de calendrier, l'heure ignorée : une action de J-7 reste dans « 7 jours » quelle que soit l'heure de consultation. L'arrondi absorbe les journées de 23 h ou 25 h des changements d'heure.
export function calendarDaysBetween(a: Date, b: Date): number {
  const dayA = new Date(a.getFullYear(), a.getMonth(), a.getDate())
  const dayB = new Date(b.getFullYear(), b.getMonth(), b.getDate())
  return Math.round(Math.abs(dayA.getTime() - dayB.getTime()) / DAY_MS)
}
