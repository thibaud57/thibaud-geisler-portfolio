import type { ActionChannel, ActionStatus, InterviewStatus } from "@/generated/prisma/client"
import { zonedDayStart } from "@/lib/date-time"
import {
  leadDisplayStatus,
  type LeadDisplayStatus,
  type LeadStatusSource,
} from "@/lib/crm/lead-display-status"
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
  leads: readonly (LeadStatusSource & { optedOutAt: Date | null })[]
}

const MESSAGE_CHANNELS: ReadonlySet<ActionChannel> = new Set([
  "DM_LINKEDIN",
  "EMAIL",
  "SMS_WHATSAPP",
])
const REPLIED: ReadonlySet<ActionStatus> = new Set(["REPONDU", "CONVERTI"])
const ACTIVE: ReadonlySet<LeadDisplayStatus> = new Set(["SUSPECT", "DISCUSSION", "RDV_PLANIFIE"])

// La réponse se date à respondedAt, pas à l'envoi : une action envoyée une semaine et répondue la suivante
// compte dans la semaine de la réponse. L'entretien compte seulement une fois FAIT.
export function countWeek(
  sources: CounterSources,
  bounds: { start: Date; end: Date },
  now: number,
): ReviewCounts {
  const inWeek = (date: Date | null) => date !== null && date >= bounds.start && date < bounds.end
  const sent = sources.actions.filter(
    (action) => action.status !== "A_FAIRE" && inWeek(action.occurredAt),
  )
  const replied = sources.actions.filter(
    (action) => REPLIED.has(action.status) && inWeek(action.respondedAt),
  )
  const isConnection = (action: { channel: ActionChannel }) =>
    action.channel === "CONNEXION_LINKEDIN"
  const isMessage = (action: { channel: ActionChannel }) => MESSAGE_CHANNELS.has(action.channel)

  return {
    connectionsSent: sent.filter(isConnection).length,
    connectionsAccepted: replied.filter(isConnection).length,
    messagesSent: sent.filter(isMessage).length,
    conversationsEngaged: replied.filter(isMessage).length,
    meetingsBooked: replied.filter((action) => isMessage(action) && action.status === "CONVERTI")
      .length,
    interviewsHeld: sources.interviews.filter(
      (interview) => interview.status === "FAIT" && inWeek(interview.scheduledAt),
    ).length,
    activeLeads: sources.leads.filter(
      (lead) => lead.optedOutAt === null && ACTIVE.has(leadDisplayStatus(lead, now)),
    ).length,
  }
}
