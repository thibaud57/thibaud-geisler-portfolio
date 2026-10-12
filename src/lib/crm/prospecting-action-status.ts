import type { ActionStatus } from "@/generated/prisma/client"
import { isSameZonedDay } from "@/lib/date-time"

export interface ActionTiming {
  status: ActionStatus
  occurredAt: Date
  respondedAt: Date | null
}

const REPLIED: ReadonlySet<string> = new Set<ActionStatus>(["REPONDU", "CONVERTI"])

export function isRepliedStatus(status: string): boolean {
  return REPLIED.has(status)
}

// `current` vaut null à la création (l'action garde sa date) ; `next.respondedAt` nul signifie « non saisie ».
export function applyStatusRules(
  current: ActionTiming | null,
  next: ActionTiming,
  now: Date,
): ActionTiming {
  // La date devient celle de l'envoi réel, sauf si la même saisie change de jour (rattrapage). Le jour
  // seul compte : le formulaire ne saisit plus l'heure.
  const leavesToDo =
    current !== null &&
    current.status === "A_FAIRE" &&
    next.status !== "A_FAIRE" &&
    isSameZonedDay(next.occurredAt, current.occurredAt)

  const respondedAt = isRepliedStatus(next.status)
    ? (next.respondedAt ?? current?.respondedAt ?? now)
    : null

  return {
    status: next.status,
    occurredAt: leavesToDo ? now : next.occurredAt,
    respondedAt,
  }
}
