import type {
  ContractStatus,
  ProjectFormat,
  ProjectStatus,
  ProjectType,
  WorkMode,
} from "@/generated/prisma/client"

export interface ProjectTimeline {
  startYear: number | null
  endYear: number | null
  inProgress: boolean
}

export function getProjectTimeline(startedAt: Date | null, endedAt: Date | null): ProjectTimeline {
  return {
    startYear: startedAt?.getFullYear() ?? null,
    endYear: endedAt?.getFullYear() ?? null,
    inProgress: startedAt !== null && endedAt === null,
  }
}

export function formatDurationRange(
  timeline: ProjectTimeline,
  inProgressLabel: string,
): string | null {
  const { startYear, endYear, inProgress } = timeline
  if (startYear === null) return null
  if (endYear && endYear !== startYear) return `${startYear} → ${endYear}`
  if (inProgress) return `${startYear} → ${inProgressLabel}`
  return String(startYear)
}

export function formatShortDate(date: Date | null): string | null {
  if (!date) return null
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${day}/${month}/${date.getFullYear()}`
}

// Accesseurs locaux, pas toISOString() : le Calendar rend une Date à minuit local, la convertir en
// UTC avant de trancher décale le jour dès que le fuseau est en avance sur UTC (France l'été).
export function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

// new Date("YYYY-MM-DD") parse la chaîne en UTC (spec ECMA-262) : décalage symétrique à toIsoDate.
// slice plutôt que split+destructuring : évite le string | undefined de noUncheckedIndexedAccess.
export function parseIsoDate(value: string): Date {
  const year = Number(value.slice(0, 4))
  const month = Number(value.slice(5, 7))
  const day = Number(value.slice(8, 10))
  return new Date(year, month - 1, day)
}

export const PROJECT_TYPE_LABELS: Record<ProjectType, string> = {
  CLIENT: "Client",
  PERSONAL: "Perso",
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  DRAFT: "Brouillon",
  PUBLISHED: "Publié",
  ARCHIVED: "Archivé",
}

export const PROJECT_FORMAT_LABELS: Record<ProjectFormat, string> = {
  API: "API",
  WEB_APP: "Web App",
  MOBILE_APP: "App Mobile",
  DESKTOP_APP: "Desktop App",
  CLI: "CLI",
  IA: "IA",
}

export const CONTRACT_STATUS_LABELS: Record<ContractStatus, string> = {
  FREELANCE: "Freelance",
  CDI: "CDI",
  STAGE: "Stage",
  ALTERNANCE: "Alternance",
}

export const WORK_MODE_LABELS: Record<WorkMode, string> = {
  REMOTE: "Remote",
  HYBRIDE: "Hybride",
  PRESENTIEL: "Sur site",
}

// Arithmétique manuelle plutôt que date-fns, présente au projet mais pour la seule locale du
// Calendar shadcn : un affichage "X mois" / "X ans" ne justifie pas d'en étendre la surface.
export function formatProjectDuration(startedAt: Date | null, endedAt: Date | null): string | null {
  if (!startedAt) return null
  const end = endedAt ?? new Date()
  // Zod refuse endedAt < startedAt depuis le formulaire d'édition, mais pas la base (seed, edit SQL
  // direct, donnée legacy) : une plage inversée n'a pas de durée plausible à afficher. Comparer les
  // dates elles-mêmes, pas seulement le delta en mois : une inversion à l'intérieur du même mois
  // calendaire (ex. 20 mai → 1er mai) a un delta de 0, que la seule comparaison de mois ne détecte pas.
  if (end < startedAt) return null
  const totalMonths =
    (end.getFullYear() - startedAt.getFullYear()) * 12 + (end.getMonth() - startedAt.getMonth())

  if (totalMonths < 12) return totalMonths <= 1 ? "1 mois" : `${totalMonths} mois`
  const years = Math.floor(totalMonths / 12)
  const remainder = totalMonths % 12
  const yearsLabel = years === 1 ? "1 an" : `${years} ans`
  return remainder === 0 ? yearsLabel : `${yearsLabel} ${remainder} mois`
}

// Partagés par les cards du formulaire projet et les blocs de sa vue détail, titres comme libellés
// de champ : consulter puis modifier doit retrouver les mêmes intitulés (docs/DESIGN.md
// § Arbitrages). Les clés des libellés sont les noms des champs du formulaire.
export const PROJECT_SECTION_TITLES = {
  identity: "Identité",
  description: "Description",
  tags: "Tags",
  caseStudy: "Case study",
  publication: "Publication",
  links: "Liens",
  cover: "Couverture",
  clientMeta: "Méta client",
} as const

export const PROJECT_FIELD_LABELS = {
  slug: "Slug",
  displayOrder: "Ordre d'affichage",
  titleFr: "Titre (français)",
  titleEn: "Titre (anglais)",
  formats: "Type de projet",
  descriptionFr: "Description (français)",
  descriptionEn: "Description (anglais)",
  caseStudyMarkdownFr: "Contenu (français)",
  caseStudyMarkdownEn: "Contenu (anglais)",
  status: "Statut",
  type: "Nature",
  startedAt: "Début",
  endedAt: "Fin",
  githubUrl: "Lien GitHub",
  demoUrl: "Lien démo",
  companyId: "Entreprise",
  workMode: "Mode de travail",
  contractStatus: "Statut de contrat",
  teamSize: "Taille d'équipe",
  deliverablesCount: "Livrables",
} as const
