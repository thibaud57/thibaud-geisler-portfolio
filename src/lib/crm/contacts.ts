import {
  Bell,
  Briefcase,
  Building2,
  CircleCheck,
  Code,
  GraduationCap,
  Handshake,
  Moon,
  Users,
} from "lucide-react"

import type { ContactStatus, ContactType } from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"

export const CONTACT_TYPE_LABELS: Record<ContactType, string> = {
  COLLEGUE: "Collègue",
  CLIENT: "Client",
  PARTENAIRE: "Partenaire",
  MENTOR: "Mentor",
  CONTACT_TECH: "Contact tech",
  COMMERCIAL: "Commercial",
}

export const CONTACT_TYPE_ICONS: Record<ContactType, IconComponent | null> = {
  COLLEGUE: Users,
  CLIENT: Building2,
  PARTENAIRE: Handshake,
  MENTOR: GraduationCap,
  CONTACT_TECH: Code,
  COMMERCIAL: Briefcase,
}

export const CONTACT_STATUS_LABELS: Record<ContactStatus, string> = {
  ACTIF: "Actif",
  INACTIF: "Inactif",
  A_RECONTACTER: "À recontacter",
}

export const CONTACT_STATUS_ICONS: Record<ContactStatus, IconComponent | null> = {
  ACTIF: CircleCheck,
  INACTIF: Moon,
  A_RECONTACTER: Bell,
}

export const CONTACT_FIELD_LABELS = {
  types: "Types",
  status: "Statut",
  leadRole: "Fiche lead",
} as const

export const CONTACT_SECTION_TITLES = {
  relation: "Relation",
} as const
