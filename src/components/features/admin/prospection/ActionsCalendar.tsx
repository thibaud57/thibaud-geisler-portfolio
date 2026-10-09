"use client"

import { startTransition, useMemo, useState } from "react"
import { fr } from "date-fns/locale"
import { toast } from "sonner"

import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { buildActionDetail } from "@/components/features/admin/prospection/action-detail"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import { EventCalendar } from "@/components/reui/event-calendar/event-calendar"
import { EventCalendarContent } from "@/components/reui/event-calendar/event-calendar-content"
import { EventCalendarNav } from "@/components/reui/event-calendar/event-calendar-nav"
import type {
  CalendarEvent,
  EventCalendarProposedUpdate,
  EventCalendarSlotInfo,
} from "@/components/reui/event-calendar/event-calendar-types"
import { ACTION_CALENDAR_I18N, actionEvents } from "@/lib/action-calendar"
import { rankActions } from "@/lib/action-rank"
import { TIME_ZONE } from "@/lib/date-time"
import { rescheduleProspectingAction } from "@/server/actions/prospecting-actions"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

type ActionEvent = CalendarEvent<AdminProspectingAction>

// Hors du rendu : le calendrier compare ces options par identité, un littéral neuf invaliderait son état à chaque ouverture de modale.
const CALENDAR_VIEWS: ["month"] = ["month"]
const CALENDAR_INTERACTIONS = { resize: false, selectSlot: false }
// La case du jour crée une action au clic : c'est un div, que le curseur posé sur les boutons par @layer base ne couvre pas.
const CALENDAR_CLASS_NAMES = { monthCell: "cursor-pointer" }

interface FormTarget {
  action: AdminProspectingAction | null
  defaultDate?: Date
}

interface Props {
  actions: readonly AdminProspectingAction[]
  personOptions: readonly PersonOption[]
}

export function ActionsCalendar({ actions, personOptions }: Props) {
  const [syncedActions, setSyncedActions] = useState<readonly AdminProspectingAction[] | null>(
    actions,
  )
  const [events, setEvents] = useState<ActionEvent[]>(() => actionEvents(actions))
  const [selectedAction, setSelectedAction] = useState<AdminProspectingAction | null>(null)
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)

  // Nouvelle lecture du serveur (revalidation après une écriture) : le calendrier s'y réaligne pendant le rendu plutôt que par un effet qui peindrait d'abord l'état périmé.
  if (actions !== syncedActions) {
    setSyncedActions(actions)
    setEvents(actionEvents(actions))
  }

  // Le rang se calcule sur toutes les actions ; seule la vue détail le lit.
  const detail = useMemo<DetailContent | null>(
    () =>
      selectedAction
        ? buildActionDetail(
            selectedAction,
            rankActions(actions).get(selectedAction.id) ?? 0,
            () => {
              setFormTarget({ action: selectedAction })
            },
          )
        : null,
    [selectedAction, actions],
  )

  function handleSlotClick(slot: EventCalendarSlotInfo) {
    setFormTarget({ action: null, defaultDate: slot.date })
  }

  function handleEventUpdate(update: EventCalendarProposedUpdate<AdminProspectingAction>) {
    const action = update.event.data
    if (action?.status !== "A_FAIRE") return false
    // Le composant déplace le jour dans son fuseau (timeZone) : l'heure de Paris se garde, changement d'heure légale compris.
    const occurredAt = update.start.toISOString()
    startTransition(async () => {
      // Un rejet (réseau coupé, redéploiement) laisserait l'action sur un jour que la base ignore : il suit le chemin d'échec.
      const result = await rescheduleProspectingAction(action.id, occurredAt).catch(() => null)
      if (!result?.ok) {
        // Réaligné sur la dernière lecture du serveur, pas sur l'instantané du geste : un autre déplacement enregistré entre-temps reste.
        setSyncedActions(null)
        toast.error(result?.errors.occurredAt?.[0] ?? "Une erreur est survenue, réessayez")
      }
    })
    return true
  }

  return (
    <>
      <EventCalendar
        events={events}
        onEventsChange={setEvents}
        onEventUpdate={handleEventUpdate}
        onEventClick={(occurrence) => {
          if (occurrence.event.data) setSelectedAction(occurrence.event.data)
        }}
        onSlotClick={handleSlotClick}
        views={CALENDAR_VIEWS}
        locale={fr}
        weekStartsOn={1}
        // Fuseau fixé : le rendu serveur (UTC) et le navigateur placeraient sinon les puces sur des jours différents près de minuit.
        timeZone={TIME_ZONE}
        i18n={ACTION_CALENDAR_I18N}
        interactions={CALENDAR_INTERACTIONS}
        classNames={CALENDAR_CLASS_NAMES}
        scrollMode="page"
        className="overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-foreground/10"
      >
        <EventCalendarNav showViewSwitcher={false} />
        <EventCalendarContent />
      </EventCalendar>

      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedAction(null)
        }}
      />
      {formTarget ? (
        <ProspectingActionFormDialog
          action={formTarget.action}
          defaultDate={formTarget.defaultDate}
          personOptions={personOptions}
          open
          onOpenChange={(open) => {
            if (!open) setFormTarget(null)
          }}
        />
      ) : null}
    </>
  )
}
