// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, skeletonWidths } from "@/lib/admin/table-widths"
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

export type LeadColumnKey = keyof typeof LEAD_COLUMN_WIDTHS

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
  "notes",
]

export const LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<LeadView, readonly LeadColumnKey[]> = {
  "en-cours": ALL_LEAD_COLUMNS,
  chauds: [
    "status",
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
    "notes",
  ],
  "a-qualifier": [
    "origin",
    "channel",
    "metAt",
    "jobRole",
    "zone",
    "linkedinUrl",
    "email",
    "phone",
    "actionsCount",
    "notes",
  ],
  "stand-by": [
    "interest",
    "score",
    "origin",
    "channel",
    "metAt",
    "jobRole",
    "zone",
    "actionsCount",
    "notes",
  ],
  all: ALL_LEAD_COLUMNS.flatMap((key) =>
    key === "actionsCount" ? [key, "interviewsCount" as const, "retentionEnd" as const] : [key],
  ),
}

export function leadSkeletonWidths(view: LeadView): readonly number[] {
  return skeletonWidths(LEAD_COLUMN_WIDTHS, ["name"], LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS[view])
}
