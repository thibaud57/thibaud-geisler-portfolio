import type { ActionChannel, ActionStatus, InterviewStatus } from "@/generated/prisma/client"
import { isContactMade } from "@/lib/crm/prospecting-action-status"

interface ContactPerson {
  metAt: Date | null
  prospectingActions: readonly { channel: ActionChannel; status: ActionStatus; occurredAt: Date }[]
}

interface CompanyInterview {
  status: InterviewStatus
  scheduledAt: Date
}

// Un contact eu, une rencontre ou un entretien tenu sur une de ses opportunités : ce qui reste à faire, à venir ou un call qui n'a pas eu lieu n'est pas un contact.
export function firstContactAtOf(
  persons: readonly ContactPerson[],
  interviews: readonly CompanyInterview[],
): Date | null {
  const times = [
    ...persons.flatMap((person) =>
      person.prospectingActions
        .filter((action) => isContactMade(action.channel, action.status))
        .map((action) => action.occurredAt.getTime()),
    ),
    ...persons.flatMap((person) => (person.metAt ? [person.metAt.getTime()] : [])),
    ...interviews
      .filter((interview) => interview.status === "FAIT")
      .map((interview) => interview.scheduledAt.getTime()),
  ]
  return times.length === 0 ? null : new Date(Math.min(...times))
}
