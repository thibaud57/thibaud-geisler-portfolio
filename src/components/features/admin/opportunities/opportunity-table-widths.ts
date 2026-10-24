// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, columnsWithout, skeletonWidths } from "@/lib/admin/table-widths"
import type { OpportunityView } from "@/lib/crm/opportunity-views"

export const OPPORTUNITY_COLUMN_WIDTHS = {
  title: 224,
  status: 128,
  referrer: 136,
  intermediary: 176,
  client: 144,
  dailyRate: 80,
  contract: 112,
  workMode: 96,
  rhythm: 128,
  zone: 104,
  startMonth: 120,
  duration: 88,
  notes: 224,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

type OpportunityColumnKey = keyof typeof OPPORTUNITY_COLUMN_WIDTHS

const ALL_OPPORTUNITY_COLUMNS: readonly OpportunityColumnKey[] = [
  "status",
  "referrer",
  "intermediary",
  "client",
  "dailyRate",
  "contract",
  "workMode",
  "rhythm",
  "zone",
  "startMonth",
  "duration",
  "notes",
]

export const OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  OpportunityView,
  readonly OpportunityColumnKey[]
> = {
  "en-cours": ALL_OPPORTUNITY_COLUMNS,
  // Toutes les acceptées ont le même statut.
  acceptees: columnsWithout(ALL_OPPORTUNITY_COLUMNS, "status"),
  all: ALL_OPPORTUNITY_COLUMNS,
}

export function opportunitySkeletonWidths(view: OpportunityView): readonly number[] {
  return skeletonWidths(
    OPPORTUNITY_COLUMN_WIDTHS,
    ["title"],
    OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS[view],
  )
}

export const OPPORTUNITY_PAGE_SKELETON: readonly string[] = [
  "h-[24px]",
  "h-[200px]",
  "h-[220px]",
  "h-[320px]",
]
