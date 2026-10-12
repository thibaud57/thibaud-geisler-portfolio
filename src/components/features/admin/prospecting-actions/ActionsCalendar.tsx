"use client"

import { startTransition, useState } from "react"
import { toast } from "sonner"

import { AdminMonthCalendar } from "@/components/features/admin/AdminMonthCalendar"
import { useProspectingActionDetail } from "@/components/features/admin/prospecting-actions/useProspectingActionDetail"
import type {
  CalendarEvent,
  EventCalendarProposedUpdate,
  EventCalendarSlotInfo,
} from "@/components/reui/event-calendar/event-calendar-types"
import { ACTION_CALENDAR_I18N, actionEvents } from "@/lib/crm/action-calendar"
import { toIsoDate } from "@/lib/date-time"
import { rescheduleProspectingAction } from "@/server/actions/prospecting-actions"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"
import { GENERIC_ERROR_TOAST } from "@/lib/admin/toasts"

type ActionEvent = CalendarEvent<AdminProspectingAction>

const CALENDAR_INTERACTIONS = { resize: false, selectSlot: false }

interface Props {
  actions: readonly AdminProspectingAction[]
  personOptions: readonly PersonOption[]
}

export function ActionsCalendar({ actions, personOptions }: Props) {
  const [syncedActions, setSyncedActions] = useState<readonly AdminProspectingAction[] | null>(
    actions,
  )
  const [events, setEvents] = useState<ActionEvent[]>(() => actionEvents(actions))
  const { openDetail, openCreate, dialogs } = useProspectingActionDetail({
    actions,
    personOptions,
  })

  // Nouvelle lecture du serveur (revalidation après une écriture) : le calendrier s'y réaligne pendant le rendu plutôt que par un effet qui peindrait d'abord l'état périmé.
  if (actions !== syncedActions) {
    setSyncedActions(actions)
    setEvents(actionEvents(actions))
  }

  function handleSlotClick(slot: EventCalendarSlotInfo) {
    openCreate(slot.date)
  }

  function handleEventUpdate(update: EventCalendarProposedUpdate<AdminProspectingAction>) {
    const action = update.event.data
    if (action?.status !== "A_FAIRE") return false
    // Seul le jour part au serveur, lu comme celui des champs date des formulaires.
    const occurredAt = toIsoDate(update.start)
    startTransition(async () => {
      // Un rejet (réseau coupé, redéploiement) laisserait l'action sur un jour que la base ignore : il suit le chemin d'échec.
      const result = await rescheduleProspectingAction(action.id, occurredAt).catch(() => null)
      if (!result?.ok) {
        // Réaligné sur la dernière lecture du serveur, pas sur l'instantané du geste : un autre déplacement enregistré entre-temps reste.
        setSyncedActions(null)
        toast.error(result?.errors.occurredAt?.[0] ?? GENERIC_ERROR_TOAST)
      }
    })
    return true
  }

  return (
    <>
      <AdminMonthCalendar
        events={events}
        onEventsChange={setEvents}
        onEventUpdate={handleEventUpdate}
        onEventClick={(occurrence) => {
          if (occurrence.event.data) openDetail(occurrence.event.data)
        }}
        onSlotClick={handleSlotClick}
        i18n={ACTION_CALENDAR_I18N}
        interactions={CALENDAR_INTERACTIONS}
      />

      {dialogs}
    </>
  )
}
