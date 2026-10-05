import { Archive, Building2, CircleCheck, Handshake, House, Moon, Network } from "lucide-react"

import type {
  CompanySector,
  CompanySize,
  CompanyType,
  RelationStatus,
} from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"

export const COMPANY_SECTOR_LABELS: Record<CompanySector, string> = {
  ASSURANCE: "Assurance",
  FINTECH: "Fintech",
  SAAS: "SaaS",
  SERVICES_RH: "Services RH",
  ESN_CONSEIL: "ESN / Conseil",
  LOGICIELS_ENTREPRISE: "Logiciels d'entreprise",
  ECOMMERCE: "E-commerce",
  IA_AUTOMATISATION: "IA / Automatisation",
  MARKETING_COMMUNICATION: "Marketing / Communication",
  BANQUE: "Banque",
  INDUSTRIE: "Industrie",
  HEALTHTECH: "Healthtech",
  SECTEUR_PUBLIC: "Secteur public",
  AUTRE: "Autre",
}

// Catégories légales (INSEE, décret n° 2008-1354) : le nom court tient dans un badge, l'effectif passe en tooltip.
export const COMPANY_SIZE_LABELS: Record<CompanySize, string> = {
  TPE: "TPE",
  PME: "PME",
  ETI: "ETI",
  GROUPE: "Grande entreprise",
}

export const COMPANY_SIZE_HEADCOUNTS: Record<CompanySize, string> = {
  TPE: "Moins de 10 salariés",
  PME: "10 à 249 salariés",
  ETI: "250 à 4 999 salariés",
  GROUPE: "5 000 salariés et plus",
}

export const COMPANY_TYPE_LABELS: Record<CompanyType, string> = {
  CLIENT_FINAL: "Client final",
  ESN_RECRUTEMENT: "ESN / Recrutement",
  PARTENAIRE: "Partenaire",
  MA_SOCIETE: "Ma société",
}

export const COMPANY_TYPE_ICONS: Record<CompanyType, IconComponent | null> = {
  CLIENT_FINAL: Building2,
  ESN_RECRUTEMENT: Network,
  PARTENAIRE: Handshake,
  MA_SOCIETE: House,
}

export const RELATION_STATUS_LABELS: Record<RelationStatus, string> = {
  ACTIVE: "Active",
  DORMANTE: "Dormante",
  ARCHIVEE: "Archivée",
}

export const COMPANY_STATUS_ICONS: Record<RelationStatus, IconComponent | null> = {
  ACTIVE: CircleCheck,
  DORMANTE: Moon,
  ARCHIVEE: Archive,
}

// Partagés par les cards du formulaire entreprise et les blocs de sa vue détail (DESIGN.md § Arbitrages).
export const COMPANY_SECTION_TITLES = {
  identity: "Identité",
  classification: "Classification",
  details: "Détails",
  relation: "Relation",
  logo: "Logo",
  notes: "Notes",
  legalEntity: "Entité légale",
} as const

export const COMPANY_FIELD_LABELS = {
  slug: "Slug",
  name: "Nom",
  websiteUrl: "Site web",
  sectors: "Secteurs",
  size: "Taille",
  legalEntityId: "Entité légale",
  types: "Types",
  relationStatus: "Statut de la relation",
  zones: "Zones",
  notes: "Notes",
  details: "Détails",
} as const
