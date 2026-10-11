import type { EventCalendarI18nOverrides } from "@/components/reui/event-calendar/event-calendar-i18n"
import type { CalendarEvent } from "@/components/reui/event-calendar/event-calendar-types"
import type { ActionStatus } from "@/generated/prisma/client"
import { formatShortInstantTime } from "@/lib/date-time"
import { EVENT_CALENDAR_FR } from "@/lib/event-calendar-fr"

const STATUS_COLORS: Record<ActionStatus, string> = {
  A_FAIRE: "var(--color-warning)",
  FAIT: "var(--color-info)",
  REPONDU: "var(--color-success)",
  CONVERTI: "var(--color-success)",
  IGNORE: "var(--color-destructive)",
}

interface CalendarActionRow {
  id: string
  title: string
  status: ActionStatus
  occurredAt: Date
}

// Une action est un instant : l'événement dure zéro minute, que le composant pose sur un seul jour, même tard le soir.
export function actionEvents<T extends CalendarActionRow>(
  actions: readonly T[],
): CalendarEvent<T>[] {
  return actions.map((action) => ({
    id: action.id,
    title: action.title,
    start: action.occurredAt,
    end: action.occurredAt,
    color: STATUS_COLORS[action.status],
    draggable: action.status === "A_FAIRE",
    data: action,
  }))
}

export const ACTION_CALENDAR_I18N: EventCalendarI18nOverrides = {
  ...EVENT_CALENDAR_FR,
  labels: {
    ...EVENT_CALENDAR_FR.labels,
    addEvent: "Nouvelle action",
    noEvents: "Aucune action",
    loading: "Chargement des actions",
    event: "action",
    events: (count) => (count === 1 ? "1 action" : `${count} actions`),
  },
  functions: {
    // Le format par défaut écrirait « 09:00 - 09:00 » pour un événement sans durée.
    formatEventTime: (start) => formatShortInstantTime(start),
  },
}
