// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, ORDER_COLUMN_WIDTH } from "@/lib/admin/table-widths"

export const TAG_COLUMN_WIDTHS = {
  name: 120,
  nameEn: 112,
  kind: 120,
  icon: 232,
  usage: 96,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export const TAG_SKELETON_WIDTHS: readonly number[] = [
  ORDER_COLUMN_WIDTH,
  ...Object.values(TAG_COLUMN_WIDTHS),
]
