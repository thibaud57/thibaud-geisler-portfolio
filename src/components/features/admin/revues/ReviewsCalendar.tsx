"use client"

import { useMemo } from "react"
import { fr } from "date-fns/locale"

import { EventCalendar } from "@/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content"
import { EventCalendarNav } from "@/components/reui/event-calendar/event-calendar-nav"
import { TIME_ZONE } from "@/lib/date-time"
import { REVIEW_CALENDAR_I18N, reviewEvents } from "@/lib/review-calendar"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

// Hors du rendu : le calendrier compare ces options par identité, un littéral neuf invaliderait son état à chaque rendu.
const CALENDAR_VIEWS: ["month"] = ["month"]
const CALENDAR_INTERACTIONS = { drag: false, resize: false, selectSlot: false }

interface Props {
  reviews: readonly AdminWeeklyReview[]
  onOpen: (review: AdminWeeklyReview) => void
}

export function ReviewsCalendar({ reviews, onOpen }: Props) {
  const events = useMemo(() => reviewEvents(reviews), [reviews])

  return (
    <EventCalendar
      events={events}
      onEventClick={(occurrence) => {
        if (occurrence.event.data) onOpen(occurrence.event.data)
      }}
      views={CALENDAR_VIEWS}
      defaultView="month"
      locale={fr}
      weekStartsOn={1}
      // Fuseau fixé : le rendu serveur (UTC) et le navigateur placeraient sinon les puces sur des jours différents près de minuit.
      timeZone={TIME_ZONE}
      i18n={REVIEW_CALENDAR_I18N}
      interactions={CALENDAR_INTERACTIONS}
      scrollMode="page"
      className="overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10"
    >
      <EventCalendarNav showViewSwitcher={false} />
      <EventCalendarContent />
    </EventCalendar>
  )
}
