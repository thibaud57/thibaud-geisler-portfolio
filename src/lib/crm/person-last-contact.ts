import type { ActionChannel, ActionStatus, InterviewStatus } from "@/generated/prisma/client"
import { isHeldCall } from "@/lib/crm/prospecting-action-status"
import { latestPastDate } from "@/lib/date-time"

interface ContactAction {
  channel: ActionChannel
  status: ActionStatus
  occurredAt: Date
  respondedAt: Date | null
}

interface ContactInterview {
  status: InterviewStatus
  scheduledAt: Date
}

// Ce qui vient de la personne : ses réponses, le call et l'entretien qu'elle a tenus. Un message resté sans réponse n'en est pas un, et une date future est une saisie erronée.
export function lastContactAtOf(
  actions: readonly ContactAction[],
  interviews: readonly ContactInterview[],
  now: Date,
): Date | null {
  return latestPastDate(
    [
      ...actions.flatMap((action) => [
        action.respondedAt,
        isHeldCall(action.channel, action.status) ? action.occurredAt : null,
      ]),
      ...interviews.map((interview) =>
        interview.status === "FAIT" ? interview.scheduledAt : null,
      ),
    ],
    now,
  )
}
