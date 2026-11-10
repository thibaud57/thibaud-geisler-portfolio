// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH } from "@/lib/admin/table-widths"

export const API_KEY_COLUMN_WIDTHS = {
  name: 240,
  domains: 120,
  createdAt: 112,
  lastRequest: 176,
  expiresAt: 136,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export const API_KEY_SKELETON_WIDTHS: readonly number[] = Object.values(API_KEY_COLUMN_WIDTHS)
