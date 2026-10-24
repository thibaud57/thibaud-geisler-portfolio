import type { RelatedHref } from "@/lib/admin/related-links"
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  Calendar,
  CirclePause,
  CircleX,
  FileText,
  Flame,
  Globe,
  Handshake,
  Mail,
  MessagesSquare,
  Phone,
  Search,
  Snowflake,
  Sparkles,
  Store,
  Sun,
} from "lucide-react"

import type {
  JobRole,
  LeadChannel,
  LeadInterest,
  LeadOrigin,
  LeadStatus,
} from "@/generated/prisma/client"
import { LinkedinIcon, type IconComponent } from "@/lib/icons"
import { JOB_ROLE_LABELS } from "@/lib/crm/job-roles"
import { PERSON_SECTION_TITLES, personDisplayName } from "@/lib/crm/persons"

export const LEAD_ORIGIN_LABELS: Record<LeadOrigin, string> = {
  INBOUND: "Inbound",
  OUTBOUND: "Outbound",
}

export const LEAD_ORIGIN_ICONS: Record<LeadOrigin, IconComponent | null> = {
  INBOUND: ArrowDownLeft,
  OUTBOUND: ArrowUpRight,
}

export const LEAD_STATUS_LABELS: Record<LeadStatus, string> = {
  NOUVEAU: "Nouveau",
  SUSPECT: "Suspect",
  DISCUSSION: "Discussion",
  HORS_ICP: "Hors ICP",
  PERDU: "Perdu",
  STAND_BY: "Stand-by",
}

export const LEAD_STATUS_ICONS: Record<LeadStatus, IconComponent | null> = {
  NOUVEAU: Sparkles,
  SUSPECT: Search,
  DISCUSSION: MessagesSquare,
  HORS_ICP: Ban,
  PERDU: CircleX,
  STAND_BY: CirclePause,
}

export const LEAD_INTEREST_LABELS: Record<LeadInterest, string> = {
  HOT: "Hot",
  WARM: "Warm",
  COLD: "Cold",
}

export const LEAD_INTEREST_ICONS: Record<LeadInterest, IconComponent | null> = {
  HOT: Flame,
  WARM: Sun,
  COLD: Snowflake,
}

export const LEAD_CHANNEL_LABELS: Record<LeadChannel, string> = {
  LINKEDIN: "LinkedIn",
  SITE_WEB: "Site web",
  CANDIDATURE: "Candidature",
  PLATEFORME: "Plateforme",
  REFERENCE: "Référence",
  EVENEMENT: "Évènement",
  COLD_EMAIL: "Cold Email",
  COLD_CALL: "Cold Call",
  AUTRE: "Autre",
}

export const LEAD_CHANNEL_ICONS: Record<LeadChannel, IconComponent | null> = {
  LINKEDIN: LinkedinIcon,
  SITE_WEB: Globe,
  CANDIDATURE: FileText,
  PLATEFORME: Store,
  REFERENCE: Handshake,
  EVENEMENT: Calendar,
  COLD_EMAIL: Mail,
  COLD_CALL: Phone,
  AUTRE: null,
}

export const LEAD_FIELD_LABELS = {
  origin: "Origine",
  status: "Statut",
  interest: "Intérêt",
  channel: "Canal",
  score: "Score",
  lastReplyAt: "Dernier contact de sa part",
  retentionEnd: "À conserver jusqu'au",
  contactRole: "Fiche contact",
} as const

export const LEAD_SECTION_TITLES = {
  pipeline: "Pipeline",
  actions: PERSON_SECTION_TITLES.actions,
  opportunities: "Opportunités apportées",
  interviews: "Entretiens",
} as const

// `statusLabel` vient de l'appelant : lead-display-status importe ce fichier, l'importer ici ferait un cycle.
export function toLeadLink(
  lead: {
    id: string
    name: string | null
    email: string | null
    linkedinUrl: string | null
    jobRole: JobRole | null
    metAt: Date | null
    createdAt: Date
  },
  { href, statusLabel }: { href: RelatedHref; statusLabel?: string },
) {
  const meta = [lead.jobRole ? JOB_ROLE_LABELS[lead.jobRole] : null, statusLabel]
    .filter(Boolean)
    .join(" · ")
  return {
    id: lead.id,
    href,
    label: personDisplayName(lead),
    ...(meta ? { meta } : {}),
    at: lead.metAt ?? lead.createdAt,
  }
}
