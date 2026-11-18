import { ActionStatus } from "@/generated/prisma/browser"
import type { ActionChannel, Prisma } from "@/generated/prisma/client"
import { isSameZonedDay } from "@/lib/date-time"

export interface ActionTiming {
  channel: ActionChannel
  status: ActionStatus
  occurredAt: Date
  respondedAt: Date | null
  reply: string | null
}

export const RESPONSE_STATUSES: ReadonlySet<ActionStatus> = new Set([
  "REPONDU",
  "CONVERTI",
  "REFUSE",
])

export const ENGAGED_STATUSES: ReadonlySet<ActionStatus> = new Set(["REPONDU", "CONVERTI"])

const ALL_STATUSES: readonly ActionStatus[] = Object.values(ActionStatus)

const statusesExcept = (...excluded: readonly ActionStatus[]): readonly ActionStatus[] =>
  ALL_STATUSES.filter((status) => !excluded.includes(status))

// Une connexion ne se convertit ni ne se refuse (elle est acceptée ou non), un call ne reçoit pas de réponse écrite.
export const ALLOWED_STATUSES: Record<ActionChannel, readonly ActionStatus[]> = {
  CANDIDATURE: ALL_STATUSES,
  CONNEXION_LINKEDIN: statusesExcept("CONVERTI", "REFUSE"),
  DM_LINKEDIN: ALL_STATUSES,
  EMAIL: ALL_STATUSES,
  SMS_WHATSAPP: ALL_STATUSES,
  CALL: statusesExcept("REPONDU", "REFUSE"),
  AUTRE: ALL_STATUSES,
}

export const STATUS_NOT_ALLOWED_MESSAGE = "Statut impossible pour ce type d'action"

export const UNSENT_ACTION_IGNORED_MESSAGE =
  "Une action jamais envoyée se supprime au lieu d'être ignorée"

export function isStatusAllowed(channel: ActionChannel, status: ActionStatus): boolean {
  return ALLOWED_STATUSES[channel].includes(status)
}

export function statusForChannel(channel: ActionChannel, status: ActionStatus): ActionStatus {
  return isStatusAllowed(channel, status) ? status : "FAIT"
}

// Un call se tient en direct : il n'a ni date ni texte de réponse.
export function channelTakesResponse(channel: ActionChannel): boolean {
  return channel !== "CALL"
}

export function hasResponseDate(channel: ActionChannel, status: ActionStatus): boolean {
  return RESPONSE_STATUSES.has(status) && channelTakesResponse(channel)
}

export function isEngagedStatus(status: ActionStatus): boolean {
  return ENGAGED_STATUSES.has(status)
}

// Seul un call planifié peut ne pas avoir lieu : un message jamais envoyé se supprime.
export function isTransitionAllowed(
  channel: ActionChannel,
  from: ActionStatus,
  to: ActionStatus,
): boolean {
  return !(from === "A_FAIRE" && to === "IGNORE" && channel !== "CALL")
}

export function isContactMade(channel: ActionChannel, status: ActionStatus): boolean {
  return isSentStatus(status) && !(channel === "CALL" && status === "IGNORE")
}

export function isHeldCall(channel: ActionChannel, status: ActionStatus): boolean {
  return channel === "CALL" && (status === "FAIT" || status === "CONVERTI")
}

export function isPlannedCall(channel: ActionChannel, status: ActionStatus): boolean {
  return channel === "CALL" && status === "A_FAIRE"
}

export function isSentStatus(status: ActionStatus): boolean {
  return status !== "A_FAIRE"
}

export function isReschedulable(status: ActionStatus): boolean {
  return status === "A_FAIRE"
}

export const SENT_STATUS_WHERE = { not: "A_FAIRE" } as const

export const HELD_CALL_WHERE = {
  channel: "CALL",
  status: { in: ["FAIT", "CONVERTI"] },
} satisfies Prisma.ProspectingActionWhereInput

// Un call planifié avant aujourd'hui est en retard, pas à venir : la borne ne garde que le jour courant et la suite.
export const plannedCallWhere = (dayStart: Date) =>
  ({ channel: "CALL", status: "A_FAIRE", occurredAt: { gte: dayStart } }) as const

// `current` vaut null à la création (l'action garde sa date) ; `next.respondedAt` nul signifie « non saisie »,
// `next.reply`, lui, n'a pas de repli sur `current` : vidé dans le formulaire, il s'efface.
export function applyStatusRules(
  current: ActionTiming | null,
  next: ActionTiming,
  now: Date,
): ActionTiming {
  // Le formulaire ne saisit que le jour : sortir d'À faire prend l'heure d'envoi réelle, sauf un call, qui n'a pas d'heure d'envoi et garde le jour planifié.
  const sameDay = current !== null && isSameZonedDay(next.occurredAt, current.occurredAt)

  const withResponse = hasResponseDate(next.channel, next.status)
  const respondedAt = withResponse ? (next.respondedAt ?? current?.respondedAt ?? now) : null

  return {
    channel: next.channel,
    status: next.status,
    occurredAt:
      !sameDay || next.status === "A_FAIRE"
        ? next.occurredAt
        : current.status === "A_FAIRE" && next.channel !== "CALL"
          ? now
          : current.occurredAt,
    respondedAt,
    reply: withResponse ? next.reply : null,
  }
}
