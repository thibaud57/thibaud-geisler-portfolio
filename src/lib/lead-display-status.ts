import { CalendarCheck, Trophy } from "lucide-react"

import type { InterviewStatus, LeadStatus, OpportunityStatus } from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"
import { LEAD_STATUS_ICONS, LEAD_STATUS_LABELS } from "@/lib/leads"
import { LEAD_STATUSES } from "@/lib/schemas/lead"

export type LeadDisplayStatus = LeadStatus | "RDV_PLANIFIE" | "DEAL"

export const LEAD_DISPLAY_STATUSES: readonly LeadDisplayStatus[] = [
  ...LEAD_STATUSES,
  "RDV_PLANIFIE",
  "DEAL",
]

export const LEAD_DISPLAY_STATUS_LABELS: Record<LeadDisplayStatus, string> = {
  ...LEAD_STATUS_LABELS,
  RDV_PLANIFIE: "RDV planifié",
  DEAL: "Deal",
}

// Les faits déduits portent leur propre glyphe, pas celui du statut saisi qu'ils recouvrent.
export const LEAD_DISPLAY_STATUS_ICONS: Record<LeadDisplayStatus, IconComponent | null> = {
  ...LEAD_STATUS_ICONS,
  RDV_PLANIFIE: CalendarCheck,
  DEAL: Trophy,
}

export interface LeadStatusSource {
  status: LeadStatus
  opportunities: readonly { status: OpportunityStatus }[]
  interviews: readonly { status: InterviewStatus; scheduledAt: Date }[]
}

// Deal et RDV planifié sont des faits déduits qui l'emportent sur le statut saisi, le deal d'abord.
export function leadDisplayStatus(lead: LeadStatusSource, now: number): LeadDisplayStatus {
  if (lead.opportunities.some((opportunity) => opportunity.status === "ACCEPTEE")) return "DEAL"
  const hasUpcomingMeeting = lead.interviews.some(
    (interview) => interview.status === "PLANIFIE" && interview.scheduledAt.getTime() >= now,
  )
  return hasUpcomingMeeting ? "RDV_PLANIFIE" : lead.status
}
