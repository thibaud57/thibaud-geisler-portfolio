import { getISOWeek, getISOWeekYear } from "date-fns"
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
import { recordFromKeys } from "@/lib/record-from-keys"
import { dateOnlyToLocal } from "@/lib/date-time"
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
  friday: "Vendredi",
  status: "Statut",
  motivation: "Motivation",
  connectionsSent: "Connexions envoyées",
  connectionsAccepted: "Connexions acceptées",
  acceptanceRate: "Taux acceptation",
  messagesSent: "Messages envoyés",
  conversationsEngaged: "Conversations engagées",
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

// La semaine de revue va du samedi au vendredi (comme `weekBounds`) : un week-end se rattache au vendredi qui le clôt, pas à celui qui le précède.
export function fridayOfWeek(day: Date): Date {
  const daysUntilFriday = (5 - day.getDay() + 7) % 7
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + daysUntilFriday)
}

// Année ISO de la semaine, pas celle du vendredi : le vendredi 1er janvier 2027 clôt la S53 de 2026.
export function weekLabel(closingFriday: Date): string {
  const friday = dateOnlyToLocal(closingFriday)
  return `S${String(getISOWeek(friday)).padStart(2, "0")} · ${getISOWeekYear(friday)}`
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

// Saisie du formulaire : un champ vide vaut 0, comme au serveur.
export function parseCounterInputs(inputs: Record<keyof ReviewCounts, string>): ReviewCounts {
  return recordFromKeys(REVIEW_COUNTER_KEYS, (key) => Number(inputs[key]) || 0)
}

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

export function formatRate(value: number | null): string | null {
  return value === null ? null : `${value} %`
}
