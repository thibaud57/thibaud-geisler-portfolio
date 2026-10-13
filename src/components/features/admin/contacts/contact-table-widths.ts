// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, skeletonWidths } from "@/lib/admin/table-widths"
import { PERSON_COLUMN_WIDTHS } from "@/components/features/admin/persons/person-table-widths"

export const CONTACT_COLUMN_WIDTHS = {
  ...PERSON_COLUMN_WIDTHS,
  types: 128,
  status: 88,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type ContactColumnKey = keyof typeof CONTACT_COLUMN_WIDTHS

export const CONTACT_DEFAULT_VISIBLE_COLUMNS: readonly ContactColumnKey[] = [
  "types",
  "status",
  "zone",
  "email",
  "linkedinUrl",
  "notes",
]

export function contactSkeletonWidths(): readonly number[] {
  return skeletonWidths(CONTACT_COLUMN_WIDTHS, ["name"], CONTACT_DEFAULT_VISIBLE_COLUMNS)
}
