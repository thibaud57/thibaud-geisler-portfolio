// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, skeletonWidths } from "@/lib/admin/table-widths"
import type { CompanyView } from "@/lib/crm/company-views"

export const COMPANY_COLUMN_WIDTHS = {
  name: 192,
  types: 160,
  sectors: 192,
  zones: 104,
  size: 128,
  relationStatus: 112,
  worked: 80,
  firstContactAt: 104,
  endClients: 120,
  legalEntity: 152,
  websiteUrl: 168,
  notes: 224,
  projects: 96,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type CompanyColumnKey = keyof typeof COMPANY_COLUMN_WIDTHS

const ALL_COMPANY_COLUMNS: readonly CompanyColumnKey[] = [
  "types",
  "sectors",
  "zones",
  "size",
  "relationStatus",
  "worked",
  "firstContactAt",
  "endClients",
  "legalEntity",
  "websiteUrl",
  "notes",
  "projects",
]

// Source unique des colonnes visibles par défaut par vue, lue par la table comme par son squelette.
export const COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<
  CompanyView,
  readonly CompanyColumnKey[]
> = {
  all: ALL_COMPANY_COLUMNS,
  travaillees: ["types", "sectors", "zones", "size", "relationStatus", "endClients", "projects"],
  recrutement: ["types", "zones", "relationStatus", "worked", "firstContactAt", "endClients"],
  // Une entreprise prospect n'est jamais travaillée : Travaillée y serait constante, Clients finaux
  // (lus sur les opportunités acceptées) et Projets (projets client seuls) toujours vides.
  prospects: ALL_COMPANY_COLUMNS.filter(
    (key) => key !== "worked" && key !== "endClients" && key !== "projects",
  ),
}

export const COMPANY_PAGE_SKELETON: string[] = [
  "h-[24px]",
  "h-[260px]",
  "h-[160px]",
  "h-[140px]",
  "h-[220px]",
]

export function companySkeletonWidths(view: CompanyView): readonly number[] {
  return skeletonWidths(COMPANY_COLUMN_WIDTHS, ["name"], COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS[view])
}
