import type { EventCalendarI18nOverrides } from "@/components/reui/event-calendar/event-calendar-i18n"

export const EVENT_CALENDAR_FR = {
  labels: {
    today: "Aujourd'hui",
    previous: "Précédent",
    next: "Suivant",
    allDay: "Toute la journée",
    more: (count: number) => `+${count} autres`,
    selectView: "Choisir la vue",
    week: (weekNumber: number) => `S${weekNumber}`,
    goToDate: "Aller à la date",
    dropNotAllowed: "Déplacement impossible",
    continues: "suite",
    timeRange: (from: string, to: string) => `${from} - ${to}`,
  },
  viewNames: { month: "Mois" },
  formats: {
    dayTitle: "EEEE d MMMM yyyy",
    moreDayHeader: "EEEE d MMMM",
    eventTime: "HH:mm",
    timeGutter: "HH'h'",
    timeGutterMinute: "HH:mm",
  },
} satisfies EventCalendarI18nOverrides
