import type { ActionStatus } from "@/generated/prisma/client"

export interface ActionTiming {
  status: ActionStatus
  occurredAt: Date
  respondedAt: Date | null
}

const REPLIED: ReadonlySet<ActionStatus> = new Set(["REPONDU", "CONVERTI"])

// `current` vaut null à la création (l'action garde sa date) ; `next.respondedAt` nul signifie « non saisie ».
export function applyStatusRules(
  current: ActionTiming | null,
  next: ActionTiming,
  now: Date,
): ActionTiming {
  // La date devient celle de l'envoi réel, sauf si la même saisie la corrige (rattrapage).
  const leavesToDo =
    current !== null &&
    current.status === "A_FAIRE" &&
    next.status !== "A_FAIRE" &&
    next.occurredAt.getTime() === current.occurredAt.getTime()

  const respondedAt = REPLIED.has(next.status)
    ? (next.respondedAt ?? current?.respondedAt ?? now)
    : null

  return {
    status: next.status,
    occurredAt: leavesToDo ? now : next.occurredAt,
    respondedAt,
  }
}
