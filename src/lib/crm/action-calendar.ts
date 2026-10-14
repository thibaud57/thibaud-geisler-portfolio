import type { EventCalendarI18nOverrides } from "@/components/reui/event-calendar/event-calendar-i18n"
import type { CalendarEvent } from "@/components/reui/event-calendar/event-calendar-types"
import type { ActionStatus } from "@/generated/prisma/client"
import { isReschedulable } from "@/lib/crm/prospecting-action-status"
import { zonedDayStartOf } from "@/lib/date-time"
import { EVENT_CALENDAR_FR } from "@/lib/admin/event-calendar-fr"

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

// Une action se date au jour, comme une revue : une journée entière, de minuit à minuit à Paris.
export function actionEvents<T extends CalendarActionRow>(
  actions: readonly T[],
): CalendarEvent<T>[] {
  return actions.map((action) => ({
    id: action.id,
    title: action.title,
    start: zonedDayStartOf(action.occurredAt),
    end: zonedDayStartOf(action.occurredAt, 1),
    allDay: true,
    color: STATUS_COLORS[action.status],
    draggable: isReschedulable(action.status),
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
}
