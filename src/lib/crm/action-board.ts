import type { ActionStatus } from "@/generated/prisma/client"

import { byOccurredAtAsc } from "./action-views"
import { isWithinCalendarDays } from "@/lib/date-time"

export const BOARD_STATUSES = [
  "A_FAIRE",
  "FAIT",
  "REPONDU",
  "CONVERTI",
  "IGNORE",
] as const satisfies readonly ActionStatus[]

export const BOARD_PERIOD_VALUES = ["7", "30", "all"] as const

export type BoardPeriod = (typeof BOARD_PERIOD_VALUES)[number]

export const BOARD_PERIOD_LABELS: Record<BoardPeriod, string> = {
  all: "Toute la période",
  "7": "7 jours",
  "30": "30 jours",
}

export interface BoardRow {
  id: string
  status: ActionStatus
  occurredAt: Date
  createdAt: Date
}

export function boardColumns<T extends BoardRow>(actions: readonly T[]): Record<ActionStatus, T[]> {
  const sorted = [...actions].sort((a, b) => byOccurredAtAsc(b, a))
  const column = (status: ActionStatus) => sorted.filter((action) => action.status === status)
  // Clés dans l'ordre de BOARD_STATUSES : le Kanban lit ses colonnes par Object.keys.
  return {
    A_FAIRE: column("A_FAIRE"),
    FAIT: column("FAIT"),
    REPONDU: column("REPONDU"),
    CONVERTI: column("CONVERTI"),
    IGNORE: column("IGNORE"),
  }
}

// Autour d'aujourd'hui, passé ou à venir : une action À faire est planifiée dans le futur.
export function actionsInPeriod<T extends { occurredAt: Date }>(
  actions: readonly T[],
  period: BoardPeriod,
  now: number,
): readonly T[] {
  if (period === "all") return actions
  const today = new Date(now)
  return actions.filter((action) => isWithinCalendarDays(today, action.occurredAt, Number(period)))
}

export interface BoardMove<T> {
  kind: "item" | "column"
  activeContainer: string
  activeIndex: number
  overContainer: string
  previousValue: Record<string, readonly T[]>
}

function isBoardStatus(value: string): value is ActionStatus {
  return (BOARD_STATUSES as readonly string[]).includes(value)
}

// Seul un changement de colonne s'enregistre : l'ordre dans une colonne suit les dates.
export function statusMoveFrom<T extends { id: string }>(
  move: BoardMove<T>,
): { id: string; status: ActionStatus } | null {
  if (move.kind !== "item" || move.activeContainer === move.overContainer) return null
  if (!isBoardStatus(move.overContainer)) return null
  const moved = move.previousValue[move.activeContainer]?.[move.activeIndex]
  return moved ? { id: moved.id, status: move.overContainer } : null
}
