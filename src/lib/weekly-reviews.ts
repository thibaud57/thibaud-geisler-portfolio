import { getISOWeek } from "date-fns"
import {
  FaceGrinning,
  FaceNeutral,
  FaceSlightlyFrowning,
  FaceSlightlySmiling,
  Minus,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react"

import type { ReviewMotivation, ReviewStatus } from "@/generated/prisma/client"
import { DAY_MS, dateOnlyToLocal } from "@/lib/date-time"
import type { IconComponent } from "@/lib/icons"

export const REVIEW_STATUS_LABELS: Record<ReviewStatus, string> = {
  BONNE: "Bonne",
  MOYENNE: "Moyenne",
  MAUVAISE: "Mauvaise",
}

export const REVIEW_STATUS_ICONS: Record<ReviewStatus, IconComponent | null> = {
  BONNE: ThumbsUp,
  MOYENNE: Minus,
  MAUVAISE: ThumbsDown,
}

export const REVIEW_MOTIVATION_LABELS: Record<ReviewMotivation, string> = {
  HAUTE: "Haute",
  POSITIVE: "Positive",
  NEUTRE: "Neutre",
  BASSE: "Basse",
}

export const REVIEW_MOTIVATION_ICONS: Record<ReviewMotivation, IconComponent | null> = {
  HAUTE: FaceGrinning,
  POSITIVE: FaceSlightlySmiling,
  NEUTRE: FaceNeutral,
  BASSE: FaceSlightlyFrowning,
}

export const REVIEW_FIELD_LABELS = {
  week: "Semaine",
  closingFriday: "Date vendredi",
  friday: "Vendredi",
  status: "Statut",
  motivation: "Motivation",
  connectionsSent: "Connexions envoyées",
  connectionsAccepted: "Connexions acceptées",
  acceptanceRate: "Taux acceptation",
  messagesSent: "Messages envoyés",
  conversationsEngaged: "Conversations engagées",
  // Deux libellés pour le même compteur : le court tient dans une colonne de liste, le long reste pour le formulaire.
  conversations: "Conversations",
  responseRate: "Taux réponse",
  meetingsBooked: "RDV décrochés",
  meetingConversion: "Conversion RDV",
  interviewsHeld: "Entretiens",
  activeLeads: "Leads actifs",
  computedRates: "Taux acceptation · réponse · conversion",
  wins: "Victoires",
  blockers: "Blocages",
  nextWeekPlan: "Plan S+1",
  notes: "Notes",
} as const

// Colonne date : le vendredi arrive à minuit UTC, il se lit et se formate en UTC.
const WEEK_DATE = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
})

export function isoDayToDate(isoDay: string): Date {
  const [year = 0, month = 1, day = 1] = isoDay.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

export function isFridayIso(isoDay: string): boolean {
  return isoDayToDate(isoDay).getUTCDay() === 5
}

// Revue faite en retard : clôture le dernier vendredi passé, jamais le suivant ; date locale, celle qu'attend le Calendar.
export function defaultClosingFriday(now: Date): Date {
  const daysSinceFriday = (now.getDay() + 2) % 7
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysSinceFriday)
}

export function weekLabel(closingFriday: Date): string {
  const week = String(getISOWeek(dateOnlyToLocal(closingFriday))).padStart(2, "0")
  const monday = new Date(closingFriday.getTime() - 4 * DAY_MS)
  return `S${week} · Semaine du ${WEEK_DATE.format(monday)}`
}

export function formatWeekDate(date: Date): string {
  return WEEK_DATE.format(date)
}

export const REVIEW_COUNTER_KEYS = [
  "connectionsSent",
  "connectionsAccepted",
  "messagesSent",
  "conversationsEngaged",
  "meetingsBooked",
  "interviewsHeld",
  "activeLeads",
] as const

export type ReviewCounts = Record<(typeof REVIEW_COUNTER_KEYS)[number], number>

function rate(numerator: number, denominator: number): number | null {
  return denominator === 0 ? null : Math.round((numerator / denominator) * 100)
}

// Jamais stockés : ils se déduisent des compteurs figés.
export function reviewRates(review: ReviewCounts): {
  acceptance: number | null
  response: number | null
  meetingConversion: number | null
} {
  return {
    acceptance: rate(review.connectionsAccepted, review.connectionsSent),
    response: rate(review.conversationsEngaged, review.messagesSent),
    meetingConversion: rate(review.meetingsBooked, review.conversationsEngaged),
  }
}

// Sans dénominateur, null : l'appelant rend la valeur absente.
export function formatRate(value: number | null): string | null {
  return value === null ? null : `${value} %`
}
