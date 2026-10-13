import { fr } from "date-fns/locale"

import {
  EventCalendar,
  type EventCalendarProps,
} from "@/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content"
import { EventCalendarNav } from "@/components/reui/event-calendar/event-calendar-nav"
import { TIME_ZONE } from "@/lib/date-time"

// Hors du rendu : le calendrier compare ces options par identité, un littéral neuf invaliderait son état à chaque rendu. Même règle pour `interactions`, à fournir en constante.
const CALENDAR_VIEWS: ["month"] = ["month"]
// La case du jour crée une fiche au clic : c'est un div, que le curseur posé sur les boutons par @layer base ne couvre pas.
const CALENDAR_CLASS_NAMES = { monthCell: "cursor-pointer" }

type Props<TData> = Pick<
  EventCalendarProps<TData>,
  "onEventsChange" | "onEventUpdate" | "onEventClick" | "onSlotClick"
> &
  Required<Pick<EventCalendarProps<TData>, "events" | "i18n" | "interactions">>

export function AdminMonthCalendar<TData>(props: Props<TData>) {
  return (
    <EventCalendar<TData>
      {...props}
      views={CALENDAR_VIEWS}
      defaultView="month"
      locale={fr}
      weekStartsOn={1}
      // Fuseau fixé : le rendu serveur (UTC) et le navigateur placeraient sinon les puces sur des jours différents près de minuit.
      timeZone={TIME_ZONE}
      classNames={CALENDAR_CLASS_NAMES}
      scrollMode="page"
      className="overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10"
    >
      <EventCalendarNav showViewSwitcher={false} />
      <EventCalendarContent />
    </EventCalendar>
  )
}
