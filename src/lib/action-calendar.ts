import type { EventCalendarI18nOverrides } from "@/components/reui/event-calendar/event-calendar-i18n"
import type { CalendarEvent } from "@/components/reui/event-calendar/event-calendar-types"
import type { ActionStatus } from "@/generated/prisma/client"
import { formatShortInstantTime } from "@/lib/date-time"

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
  labels: {
    today: "Aujourd'hui",
    previous: "Précédent",
    next: "Suivant",
    addEvent: "Nouvelle action",
    allDay: "Toute la journée",
    more: (count) => `+${count} autres`,
    noEvents: "Aucune action",
    loading: "Chargement des actions",
    event: "action",
    events: (count) => (count === 1 ? "1 action" : `${count} actions`),
    selectView: "Choisir la vue",
    week: (weekNumber) => `S${weekNumber}`,
    goToDate: "Aller à la date",
    dropNotAllowed: "Déplacement impossible",
    continues: "suite",
    timeRange: (from, to) => `${from} - ${to}`,
  },
  viewNames: { month: "Mois" },
  formats: {
    dayTitle: "EEEE d MMMM yyyy",
    moreDayHeader: "EEEE d MMMM",
    eventTime: "HH:mm",
    timeGutter: "HH'h'",
    timeGutterMinute: "HH:mm",
  },
  functions: {
    // Le format par défaut écrirait « 09:00 - 09:00 » pour un événement sans durée.
    formatEventTime: (start) => formatShortInstantTime(start),
  },
}
