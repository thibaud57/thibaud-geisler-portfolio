// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, skeletonWidths } from "@/lib/admin/table-widths"
import type { InterviewView } from "@/lib/crm/interview-views"

export const INTERVIEW_COLUMN_WIDTHS = {
  title: 216,
  opportunity: 200,
  side: 144,
  scheduledAt: 152,
  type: 144,
  format: 80,
  status: 72,
  outcome: 112,
  zone: 104,
  workMode: 96,
  dailyRate: 80,
  score: 88,
  decision: 152,
  correspondents: 152,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

type InterviewColumnKey = keyof typeof INTERVIEW_COLUMN_WIDTHS

// À venir masque Statut, toujours Planifié dans cette vue, et Issue, Score et Décision, qui n'existent
// qu'une fois l'entretien fait. Journal, la vue complète, montre toutes ses colonnes.
export const INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  InterviewView,
  readonly InterviewColumnKey[]
> = {
  "a-venir": [
    "opportunity",
    "side",
    "scheduledAt",
    "type",
    "format",
    "zone",
    "workMode",
    "dailyRate",
    "correspondents",
  ],
  journal: [
    "opportunity",
    "side",
    "scheduledAt",
    "type",
    "format",
    "status",
    "outcome",
    "zone",
    "workMode",
    "dailyRate",
    "score",
    "decision",
    "correspondents",
  ],
}

export function interviewSkeletonWidths(view: InterviewView): readonly number[] {
  return skeletonWidths(
    INTERVIEW_COLUMN_WIDTHS,
    ["title"],
    INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
  )
}

export const INTERVIEW_PAGE_SKELETON: readonly string[] = [
  "h-[24px]",
  "h-[180px]",
  "h-[260px]",
  "h-[320px]",
]
