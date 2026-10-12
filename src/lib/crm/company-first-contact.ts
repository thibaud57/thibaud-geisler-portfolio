import type { ActionStatus } from "@/generated/prisma/client"

interface ContactAction {
  status: ActionStatus
  occurredAt: Date
}

interface ContactPerson {
  prospectingActions: readonly ContactAction[]
}

export function firstContactAtOf(persons: readonly ContactPerson[]): Date | null {
  const sentTimes = persons
    .flatMap((person) => person.prospectingActions)
    .filter((action) => action.status !== "A_FAIRE")
    .map((action) => action.occurredAt.getTime())
  return sentTimes.length === 0 ? null : new Date(Math.min(...sentTimes))
}
