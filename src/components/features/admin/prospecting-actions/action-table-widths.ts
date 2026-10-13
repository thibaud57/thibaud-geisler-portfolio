// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

import { ACTIONS_COLUMN_WIDTH, skeletonWidths } from "@/lib/admin/table-widths"
import type { ActionView } from "@/lib/crm/action-views"

export const ACTION_COLUMN_WIDTHS = {
  title: 280,
  channel: 160,
  status: 104,
  occurredAt: 104,
  person: 184,
  actions: ACTIONS_COLUMN_WIDTH,
} as const

export type ActionColumnKey = keyof typeof ACTION_COLUMN_WIDTHS

export const ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS: Record<ActionView, readonly ActionColumnKey[]> = {
  "a-faire": ["channel", "occurredAt", "person"],
  connexions: ["occurredAt", "person"],
  discussions: ["channel", "occurredAt", "person"],
  candidatures: ["occurredAt", "person"],
  journal: ["channel", "status", "occurredAt", "person"],
}

export function actionSkeletonWidths(view: ActionView): readonly number[] {
  return skeletonWidths(ACTION_COLUMN_WIDTHS, ["title"], ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS[view])
}
