// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, columnsWithout, skeletonWidths } from "@/lib/admin/table-widths"
import { PERSON_COLUMN_WIDTHS } from "@/components/features/admin/persons/person-table-widths"
import type { LeadView } from "@/lib/crm/lead-views"

export const LEAD_COLUMN_WIDTHS = {
  ...PERSON_COLUMN_WIDTHS,
  status: 112,
  interest: 88,
  score: 88,
  origin: 112,
  channel: 120,
  metAt: 112,
  jobRole: 120,
  actionsCount: 96,
  interviewsCount: 112,
  retentionEnd: 112,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

type LeadColumnKey = keyof typeof LEAD_COLUMN_WIDTHS

const ALL_LEAD_COLUMNS: readonly LeadColumnKey[] = [
  "status",
  "interest",
  "score",
  "origin",
  "channel",
  "metAt",
  "jobRole",
  "zone",
  "linkedinUrl",
  "email",
  "phone",
  "actionsCount",
  "interviewsCount",
  "retentionEnd",
  "notes",
]

// Échéance de conservation réservée à Tous, seule vue qui montre les fiches échues (décision du 2026-10-13).
const OPEN_LEAD_COLUMNS = columnsWithout(ALL_LEAD_COLUMNS, "retentionEnd")

export const LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<LeadView, readonly LeadColumnKey[]> = {
  "en-cours": OPEN_LEAD_COLUMNS,
  chauds: columnsWithout(OPEN_LEAD_COLUMNS, "interest"),
  // Pas encore qualifié : ni statut (constant), ni intérêt, ni score.
  "a-qualifier": columnsWithout(OPEN_LEAD_COLUMNS, "status", "interest", "score"),
  "stand-by": columnsWithout(OPEN_LEAD_COLUMNS, "status"),
  all: ALL_LEAD_COLUMNS,
}

export function leadSkeletonWidths(view: LeadView): readonly number[] {
  return skeletonWidths(LEAD_COLUMN_WIDTHS, ["name"], LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS[view])
}
