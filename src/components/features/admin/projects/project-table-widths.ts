// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, ORDER_COLUMN_WIDTH, skeletonWidths } from "@/lib/admin/table-widths"
import type { ProjectView } from "@/lib/project-views"

export const PROJECT_COLUMN_WIDTHS = {
  titre: 280,
  nature: 80,
  formats: 120,
  entreprise: 144,
  contrat: 112,
  debut: 104,
  fin: 104,
  duree: 104,
  equipe: 72,
  liens: 120,
  statut: 72,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type ProjectColumnKey = keyof typeof PROJECT_COLUMN_WIDTHS

export const PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  ProjectView,
  readonly ProjectColumnKey[]
> = {
  all: [
    "nature",
    "formats",
    "entreprise",
    "contrat",
    "debut",
    "fin",
    "duree",
    "equipe",
    "liens",
    "statut",
  ],
  client: ["formats", "entreprise", "debut", "duree", "statut"],
  perso: ["formats", "debut", "fin", "liens", "statut"],
}

export function projectSkeletonWidths(view: ProjectView): readonly number[] {
  return [
    ORDER_COLUMN_WIDTH,
    ...skeletonWidths(PROJECT_COLUMN_WIDTHS, ["titre"], PROJECT_VIEW_DEFAULT_VISIBLE_COLUMNS[view]),
  ]
}

export const PROJECT_PAGE_SKELETON: string[] = [
  "h-[24px]",
  "h-[320px]",
  "h-[260px]",
  "h-[160px]",
  "h-[320px]",
  "h-[220px]",
  "h-[160px]",
  "h-[220px]",
  "h-[220px]",
]
