import { tz } from "@date-fns/tz"
import { addMonths, subMonths } from "date-fns"

import type {
  ActionChannel,
  ActionStatus,
  InterviewStatus,
  OpportunityStatus,
  ProjectType,
  RelationStatus,
} from "@/generated/prisma/client"
import { isContactMade } from "@/lib/crm/prospecting-action-status"
import { latestPastDate, TIME_ZONE, zonedDayStartOf } from "@/lib/date-time"

// Dormante se déduit : seul le statut saisi (Active, Archivée) vit en base.
export type CompanyRelationDisplayStatus = RelationStatus | "DORMANTE"

export const COMPANY_RELATION_DISPLAY_STATUSES = [
  "ACTIVE",
  "DORMANTE",
  "ARCHIVEE",
] as const satisfies readonly CompanyRelationDisplayStatus[]

export const DORMANCY_MONTHS = 12

export interface InteractionSources {
  actions: readonly {
    channel: ActionChannel
    status: ActionStatus
    occurredAt: Date
    respondedAt: Date | null
  }[]
  metAts: readonly Date[]
  interviews: readonly { status: InterviewStatus; scheduledAt: Date }[]
  projects: readonly { type: ProjectType; startedAt: Date | null; endedAt: Date | null }[]
  opportunities: readonly {
    status: OpportunityStatus
    startMonth: Date | null
    durationMonths: number | null
  }[]
}

// Mois civils lus en UTC, comme la colonne `@db.Date` de `startMonth`.
const UTC = tz("UTC")

function missionInteractionAt(
  mission: { startMonth: Date | null; durationMonths: number | null },
  now: Date,
): Date | null {
  if (mission.startMonth === null || mission.startMonth > now) return null
  if (mission.durationMonths === null) return mission.startMonth
  const end = new Date(addMonths(mission.startMonth, mission.durationMonths, { in: UTC }).getTime())
  return end > now ? now : end
}

// Un projet client en cours et une mission qui court comptent pour aujourd'hui ; une date future est une saisie erronée.
export function lastInteractionAtOf(sources: InteractionSources, now: Date): Date | null {
  return latestPastDate(
    [
      ...sources.actions.flatMap((action) =>
        isContactMade(action.channel, action.status) ? [action.occurredAt, action.respondedAt] : [],
      ),
      ...sources.metAts,
      ...sources.interviews.flatMap((interview) =>
        interview.status === "FAIT" ? [interview.scheduledAt] : [],
      ),
      ...sources.projects.flatMap((project) =>
        project.type !== "CLIENT"
          ? []
          : [
              project.endedAt && project.endedAt <= now
                ? project.endedAt
                : project.startedAt && project.startedAt <= now
                  ? now
                  : null,
            ],
      ),
      ...sources.opportunities.flatMap((opportunity) =>
        opportunity.status === "ACCEPTEE" ? [missionInteractionAt(opportunity, now)] : [],
      ),
    ],
    now,
  )
}

// Une entreprise jamais contactée n'est pas en sommeil ; Archivée est un jugement saisi qui l'emporte.
export function relationDisplayStatus(
  stored: RelationStatus,
  lastInteractionAt: Date | null,
  now: Date,
): CompanyRelationDisplayStatus {
  if (stored === "ARCHIVEE" || lastInteractionAt === null) return stored
  const threshold = zonedDayStartOf(
    new Date(subMonths(now, DORMANCY_MONTHS, { in: tz(TIME_ZONE) }).getTime()),
  )
  return lastInteractionAt < threshold ? "DORMANTE" : stored
}
