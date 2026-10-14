import { Archive, Building2, CircleCheck, Handshake, House, Moon, Network } from "lucide-react"

import type {
  CompanySector,
  CompanySize,
  CompanyType,
  OpportunityStatus,
  ProjectType,
  RelationStatus,
} from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"
import type { CompanyInput } from "@/lib/schemas/company"
import { OPPORTUNITY_FIELD_LABELS } from "@/lib/crm/opportunities"

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

export const COMPANY_SECTION_TITLES = {
  identity: "Identité",
  classification: "Classification",
  details: "Détails",
  relation: "Relation",
  logo: "Logo",
  notes: "Notes",
  legalEntity: "Entité légale",
  leads: "Leads",
  opportunities: "Opportunités",
} as const

export const COMPANY_FIELD_LABELS = {
  slug: "Slug",
  name: "Nom",
  websiteUrl: "Site web",
  sectors: "Secteurs",
  size: "Taille",
  legalEntity: "Entité légale",
  types: "Types",
  relationStatus: "Statut de la relation",
  worked: "Travaillée",
  projects: "Projets",
  firstContactAt: "Premier contact",
  endClients: "Clients finaux",
  zones: "Localités",
  notes: "Notes",
  details: "Détails",
} as const

// Rien n'est écrit : le client final se lit sur les opportunités gagnées, jamais saisi sur l'ESN.
export function joinedEndClientNames(company: {
  opportunitiesAsIntermediary: readonly {
    status: OpportunityStatus
    client: { id: string; name: string } | null
  }[]
}): string[] {
  const names = new Map<string, string>()
  for (const opportunity of company.opportunitiesAsIntermediary) {
    if (opportunity.status === "ACCEPTEE" && opportunity.client) {
      names.set(opportunity.client.id, opportunity.client.name)
    }
  }
  return [...names.values()].sort((a, b) => a.localeCompare(b, "fr"))
}

export function hasAcceptedOpportunity(company: {
  opportunitiesAsIntermediary: readonly { status: OpportunityStatus }[]
  opportunitiesAsClient: readonly { status: OpportunityStatus }[]
}): boolean {
  return (
    company.opportunitiesAsIntermediary.some((opportunity) => opportunity.status === "ACCEPTEE") ||
    company.opportunitiesAsClient.some((opportunity) => opportunity.status === "ACCEPTEE")
  )
}

// Un projet personnel crée aussi un ClientMeta (ma société) : seul un projet CLIENT compte.
export function countClientProjects(
  clientMetas: readonly { project: { type: ProjectType } }[],
): number {
  return clientMetas.filter((meta) => meta.project.type === "CLIENT").length
}

export function isWorkedCompany(company: {
  clientProjectCount: number
  opportunitiesAsIntermediary: readonly { status: OpportunityStatus }[]
  opportunitiesAsClient: readonly { status: OpportunityStatus }[]
}): boolean {
  return company.clientProjectCount > 0 || hasAcceptedOpportunity(company)
}

export function companyCrmFields(data: CompanyInput) {
  return {
    types: data.types,
    relationStatus: data.relationStatus,
    zones: data.zones,
    notes: data.notes,
    details: data.details,
  }
}

export function companyFields(data: CompanyInput) {
  return {
    slug: data.slug,
    name: data.name,
    sectors: data.sectors,
    size: data.size,
    websiteUrl: data.websiteUrl,
    logoFilename: data.logoFilename,
    ...companyCrmFields(data),
  }
}

export function isEsn(company: { types: readonly CompanyType[] }): boolean {
  return company.types.includes("ESN_RECRUTEMENT")
}

// Une entreprise peut être l'ESN d'une opportunité et le client final d'une autre : chaque ligne dit son rôle.
export function companyOpportunities<T>(company: {
  opportunitiesAsIntermediary: readonly T[]
  opportunitiesAsClient: readonly T[]
}): { opportunity: T; role: string }[] {
  return [
    ...company.opportunitiesAsIntermediary.map((opportunity) => ({
      opportunity,
      role: OPPORTUNITY_FIELD_LABELS.intermediaryId,
    })),
    ...company.opportunitiesAsClient.map((opportunity) => ({
      opportunity,
      role: OPPORTUNITY_FIELD_LABELS.clientId,
    })),
  ]
}

function counted(count: number, singular: string, plural: string): string | null {
  return count === 0 ? null : `${count} ${count > 1 ? plural : singular}`
}

export function companyLinksLabel(projects: number, opportunities: number): string {
  return [
    counted(projects, "projet", "projets"),
    counted(opportunities, "opportunité", "opportunités"),
  ]
    .filter((part): part is string => part !== null)
    .join(" et ")
}
