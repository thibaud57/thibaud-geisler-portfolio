import type { ActionStatus, InterviewStatus } from "@/generated/prisma/client"
import { isSentStatus } from "@/lib/crm/prospecting-action-status"

interface ContactPerson {
  metAt: Date | null
  prospectingActions: readonly { status: ActionStatus; occurredAt: Date }[]
}

interface CompanyInterview {
  status: InterviewStatus
  scheduledAt: Date
}

// Une action envoyée, une rencontre ou un entretien tenu sur une de ses opportunités : ce qui reste à faire ou à venir n'est pas un contact.
export function firstContactAtOf(
  persons: readonly ContactPerson[],
  interviews: readonly CompanyInterview[],
): Date | null {
  const times = [
    ...persons.flatMap((person) =>
      person.prospectingActions
        .filter((action) => isSentStatus(action.status))
        .map((action) => action.occurredAt.getTime()),
    ),
    ...persons.flatMap((person) => (person.metAt ? [person.metAt.getTime()] : [])),
    ...interviews
      .filter((interview) => interview.status === "FAIT")
      .map((interview) => interview.scheduledAt.getTime()),
  ]
  return times.length === 0 ? null : new Date(Math.min(...times))
}
