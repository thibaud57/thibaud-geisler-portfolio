import type { ActionChannel, ActionStatus, InterviewStatus } from "@/generated/prisma/client"
import { MESSAGE_CHANNELS, REPLYABLE_CHANNELS } from "@/lib/crm/action-views"
import { zonedDayStart } from "@/lib/date-time"
import {
  leadDisplayStatus,
  type LeadDisplayStatus,
  type LeadStatusSource,
} from "@/lib/crm/lead-display-status"
import { isEngagedStatus, isHeldCall, isSentStatus } from "@/lib/crm/prospecting-action-status"
import type { ReviewCounts } from "@/lib/crm/weekly-reviews"

// Le week-end (samedi, dimanche) compte dans la semaine qui se clôt le vendredi suivant ; les bornes sont
// calculées en heure de Paris pour qu'un changement d'heure ne décale pas la semaine.
export function weekBounds(closingFriday: Date): { start: Date; end: Date } {
  return { start: zonedDayStart(closingFriday, -6), end: zonedDayStart(closingFriday, 1) }
}

export interface CounterSources {
  actions: readonly {
    channel: ActionChannel
    status: ActionStatus
    occurredAt: Date
    respondedAt: Date | null
  }[]
  interviews: readonly { status: InterviewStatus; scheduledAt: Date }[]
  leads: readonly LeadStatusSource[]
}

export const ACTIVE_LEAD_STATUSES: ReadonlySet<LeadDisplayStatus | null> = new Set([
  "SUSPECT",
  "DISCUSSION",
  "RDV_PLANIFIE",
])

// La réponse se date à respondedAt, pas à l'envoi : une action envoyée une semaine et répondue la suivante
// compte dans la semaine de la réponse. Un call se date au jour où il se tient (il n'a pas de réponse), et
// l'entretien compte seulement une fois FAIT. Un refus est une réponse : il n'entre pas dans les conversations.
export function countWeek(
  sources: CounterSources,
  bounds: { start: Date; end: Date },
  now: Date,
): ReviewCounts {
  const inWeek = (date: Date | null) => date !== null && date >= bounds.start && date < bounds.end
  const sent = sources.actions.filter(
    (action) => isSentStatus(action.status) && inWeek(action.occurredAt),
  )
  const responded = sources.actions.filter((action) => inWeek(action.respondedAt))
  const isConnection = (action: { channel: ActionChannel }) =>
    action.channel === "CONNEXION_LINKEDIN"
  const isMessage = (action: { channel: ActionChannel }) => MESSAGE_CHANNELS.has(action.channel)
  const heldCalls = sent.filter((action) => isHeldCall(action.channel, action.status))

  return {
    connectionsSent: sent.filter(isConnection).length,
    connectionsAccepted: responded.filter(
      (action) => isConnection(action) && action.status === "REPONDU",
    ).length,
    messagesSent: sent.filter(isMessage).length,
    conversationsEngaged: responded.filter(
      (action) => isMessage(action) && isEngagedStatus(action.status),
    ).length,
    refusalsReceived: responded.filter((action) => isMessage(action) && action.status === "REFUSE")
      .length,
    meetingsBooked: responded.filter(
      (action) => REPLYABLE_CHANNELS.has(action.channel) && action.status === "CONVERTI",
    ).length,
    interviewsHeld:
      sources.interviews.filter(
        (interview) => interview.status === "FAIT" && inWeek(interview.scheduledAt),
      ).length + heldCalls.length,
    activeLeads: sources.leads.filter((lead) =>
      ACTIVE_LEAD_STATUSES.has(leadDisplayStatus(lead, now)),
    ).length,
  }
}
