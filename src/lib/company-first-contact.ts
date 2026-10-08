import type { ActionStatus } from "@/generated/prisma/client"

interface ContactAction {
  status: ActionStatus
  occurredAt: Date
}

interface ContactPerson {
  prospectingActions: readonly ContactAction[]
}

// Premier contact d'une entreprise : la plus ancienne action envoyée (hors À faire, encore planifiée) parmi ses personnes, quel que soit leur rôle.
export function firstContactAtOf(persons: readonly ContactPerson[]): Date | null {
  const sentTimes = persons
    .flatMap((person) => person.prospectingActions)
    .filter((action) => action.status !== "A_FAIRE")
    .map((action) => action.occurredAt.getTime())
  return sentTimes.length === 0 ? null : new Date(Math.min(...sentTimes))
}
