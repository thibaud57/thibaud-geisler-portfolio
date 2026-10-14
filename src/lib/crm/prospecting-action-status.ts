import type { ActionStatus } from "@/generated/prisma/client"
import { isSameZonedDay } from "@/lib/date-time"

export interface ActionTiming {
  status: ActionStatus
  occurredAt: Date
  respondedAt: Date | null
  reply: string | null
}

const REPLIED: ReadonlySet<string> = new Set<ActionStatus>(["REPONDU", "CONVERTI"])

export function isRepliedStatus(status: string): boolean {
  return REPLIED.has(status)
}

export function isSentStatus(status: ActionStatus): boolean {
  return status !== "A_FAIRE"
}

export function isReschedulable(status: ActionStatus): boolean {
  return status === "A_FAIRE"
}

export const SENT_STATUS_WHERE = { not: "A_FAIRE" } as const

// `current` vaut null à la création (l'action garde sa date) ; `next.respondedAt` nul signifie « non saisie »,
// `next.reply`, lui, n'a pas de repli sur `current` : vidé dans le formulaire, il s'efface.
export function applyStatusRules(
  current: ActionTiming | null,
  next: ActionTiming,
  now: Date,
): ActionTiming {
  // Le formulaire ne saisit que le jour : tant qu'il ne change pas, l'heure se conserve, et une action qui
  // quitte À faire prend l'heure de l'envoi réel. Un changement de jour (rattrapage) garde la saisie.
  const sameDay = current !== null && isSameZonedDay(next.occurredAt, current.occurredAt)

  const replied = isRepliedStatus(next.status)
  const respondedAt = replied ? (next.respondedAt ?? current?.respondedAt ?? now) : null

  return {
    status: next.status,
    occurredAt:
      !sameDay || next.status === "A_FAIRE"
        ? next.occurredAt
        : current.status === "A_FAIRE"
          ? now
          : current.occurredAt,
    respondedAt,
    reply: replied ? next.reply : null,
  }
}
