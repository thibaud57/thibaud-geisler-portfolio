// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, skeletonWidths } from "@/lib/admin/table-widths"
import type { ReviewView } from "@/lib/crm/review-views"

export const REVIEW_COLUMN_WIDTHS = {
  // Libellé le plus long : « S53 · 2026 », sous l'en-tête Semaine et son icône de tri.
  week: 104,
  friday: 112,
  connectionsSent: 120,
  connectionsAccepted: 120,
  acceptanceRate: 128,
  messagesSent: 112,
  conversationsEngaged: 136,
  responseRate: 104,
  meetingsBooked: 120,
  meetingConversion: 120,
  interviewsHeld: 112,
  activeLeads: 88,
  status: 104,
  motivation: 96,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type ReviewColumnKey = keyof typeof REVIEW_COLUMN_WIDTHS

const ALL_REVIEW_COLUMNS: readonly ReviewColumnKey[] = [
  "friday",
  "connectionsSent",
  "connectionsAccepted",
  "acceptanceRate",
  "messagesSent",
  "conversationsEngaged",
  "responseRate",
  "meetingsBooked",
  "meetingConversion",
  "interviewsHeld",
  "activeLeads",
  "status",
  "motivation",
]

export const REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<ReviewView, readonly ReviewColumnKey[]> = {
  revue: ALL_REVIEW_COLUMNS,
  // Calendrier n'a pas de table : son squelette de chargement reprend les colonnes de Revue.
  calendrier: ALL_REVIEW_COLUMNS,
  journal: ALL_REVIEW_COLUMNS,
}

export function reviewSkeletonWidths(view: ReviewView): readonly number[] {
  return skeletonWidths(REVIEW_COLUMN_WIDTHS, ["week"], REVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view])
}
