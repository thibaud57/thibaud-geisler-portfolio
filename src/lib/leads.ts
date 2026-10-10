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

import type { LeadChannel, LeadInterest, LeadOrigin, LeadStatus } from "@/generated/prisma/client"
import { LinkedinIcon, type IconComponent } from "@/lib/icons"

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

// Uniquement les champs du rôle : ceux de la personne vivent dans PERSON_FIELD_LABELS (`@/lib/persons`).
export const LEAD_FIELD_LABELS = {
  origin: "Origine",
  status: "Statut",
  interest: "Intérêt",
  channel: "Canal",
  score: "Score",
  lastReplyAt: "Dernier contact de sa part",
} as const

export const LEAD_SECTION_TITLES = {
  pipeline: "Pipeline",
  network: "Réseau",
  actions: "Actions",
  opportunities: "Opportunités apportées",
} as const
