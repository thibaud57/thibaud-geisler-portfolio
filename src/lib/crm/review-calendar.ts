import type { EventCalendarI18nOverrides } from "@/components/reui/event-calendar/event-calendar-i18n"
import type { CalendarEvent } from "@/components/reui/event-calendar/event-calendar-types"
import type { ReviewStatus } from "@/generated/prisma/client"
import { zonedDayStart } from "@/lib/date-time"
import { EVENT_CALENDAR_FR } from "@/lib/admin/event-calendar-fr"
import { weekLabel } from "@/lib/crm/weekly-reviews"

const STATUS_COLORS: Record<ReviewStatus, string> = {
  BONNE: "var(--color-success)",
  MOYENNE: "var(--color-warning)",
  MAUVAISE: "var(--color-destructive)",
}

interface CalendarReviewRow {
  id: string
  closingFriday: Date
  status: ReviewStatus | null
}

// Le composant segmente les instants bruts : une journée entière commence et finit à minuit du fuseau d'affichage.
export function reviewEvents<T extends CalendarReviewRow>(
  reviews: readonly T[],
): CalendarEvent<T>[] {
  return reviews.map((review) => ({
    id: review.id,
    title: weekLabel(review.closingFriday),
    start: zonedDayStart(review.closingFriday),
    end: zonedDayStart(review.closingFriday, 1),
    allDay: true,
    color: review.status ? STATUS_COLORS[review.status] : "var(--color-muted-foreground)",
    draggable: false,
    resizable: false,
    data: review,
  }))
}

export const REVIEW_CALENDAR_I18N: EventCalendarI18nOverrides = {
  ...EVENT_CALENDAR_FR,
  labels: {
    ...EVENT_CALENDAR_FR.labels,
    noEvents: "Aucune revue",
    loading: "Chargement des revues",
    event: "revue",
    events: (count) => (count === 1 ? "1 revue" : `${count} revues`),
  },
}
