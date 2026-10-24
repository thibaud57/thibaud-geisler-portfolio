"use client"

import { useMemo } from "react"

import { AdminMonthCalendar } from "@/components/features/admin/display/AdminMonthCalendar"
import type { EventCalendarSlotInfo } from "@/components/reui/event-calendar/event-calendar-types"
import { dateOnlyToLocal, toIsoDate } from "@/lib/date-time"
import { REVIEW_CALENDAR_I18N, reviewEvents } from "@/lib/crm/review-calendar"
import { fridayOfWeek } from "@/lib/crm/weekly-reviews"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

const CALENDAR_INTERACTIONS = { drag: false, resize: false, selectSlot: false } as const

interface Props {
  reviews: readonly AdminWeeklyReview[]
  onOpen: (review: AdminWeeklyReview) => void
  onCreate: (closingFriday: Date) => void
}

export function ReviewsCalendar({ reviews, onOpen, onCreate }: Props) {
  const events = useMemo(() => reviewEvents(reviews), [reviews])

  function handleSlotClick(slot: EventCalendarSlotInfo) {
    const friday = fridayOfWeek(slot.date)
    const closed = reviews.find(
      (review) => toIsoDate(dateOnlyToLocal(review.closingFriday)) === toIsoDate(friday),
    )
    if (closed) onOpen(closed)
    else onCreate(friday)
  }

  return (
    <AdminMonthCalendar
      events={events}
      onEventClick={(occurrence) => {
        if (occurrence.event.data) onOpen(occurrence.event.data)
      }}
      onSlotClick={handleSlotClick}
      i18n={REVIEW_CALENDAR_I18N}
      interactions={CALENDAR_INTERACTIONS}
    />
  )
}
