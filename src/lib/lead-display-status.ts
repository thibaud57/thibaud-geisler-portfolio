import { Trophy } from "lucide-react"

import type { LeadStatus, OpportunityStatus } from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"
import { LEAD_STATUS_ICONS, LEAD_STATUS_LABELS } from "@/lib/leads"
import { LEAD_STATUSES } from "@/lib/schemas/lead"

export type LeadDisplayStatus = LeadStatus | "DEAL"

export const LEAD_DISPLAY_STATUSES: readonly LeadDisplayStatus[] = [...LEAD_STATUSES, "DEAL"]

export const LEAD_DISPLAY_STATUS_LABELS: Record<LeadDisplayStatus, string> = {
  ...LEAD_STATUS_LABELS,
  DEAL: "Deal",
}

// Glyphe propre au fait « Deal », pas celui du statut saisi qu'il recouvre.
export const LEAD_DISPLAY_STATUS_ICONS: Record<LeadDisplayStatus, IconComponent | null> = {
  ...LEAD_STATUS_ICONS,
  DEAL: Trophy,
}

export interface LeadStatusSource {
  status: LeadStatus
  opportunities: readonly { status: OpportunityStatus }[]
}

// Le deal est un fait de l'opportunité : une opportunité acceptée l'emporte sur le statut saisi.
export function leadDisplayStatus(lead: LeadStatusSource): LeadDisplayStatus {
  return lead.opportunities.some((opportunity) => opportunity.status === "ACCEPTEE")
    ? "DEAL"
    : lead.status
}
