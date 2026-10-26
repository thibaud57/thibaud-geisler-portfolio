import { AppWindow, Bot, Monitor, Smartphone, SquareTerminal, Webhook } from "lucide-react"

import { ProjectFormat, ProjectStatus, ProjectType } from "@/generated/prisma/browser"
import type { IconComponent } from "@/lib/icons"

export type ProjectTimeline =
  { kind: "none" } | { kind: "ongoing"; start: Date } | { kind: "ended"; start: Date; end: Date }

export function getProjectTimeline(startedAt: Date | null, endedAt: Date | null): ProjectTimeline {
  if (startedAt === null) return { kind: "none" }
  return endedAt === null
    ? { kind: "ongoing", start: startedAt }
    : { kind: "ended", start: startedAt, end: endedAt }
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

export const PROJECT_TYPES = Object.values(ProjectType)
export const PROJECT_STATUSES = Object.values(ProjectStatus)
export const PROJECT_FORMATS = Object.values(ProjectFormat)

export const PROJECT_FORMAT_ICONS: Record<ProjectFormat, IconComponent | null> = {
  API: Webhook,
  WEB_APP: AppWindow,
  MOBILE_APP: Smartphone,
  DESKTOP_APP: Monitor,
  CLI: SquareTerminal,
  IA: Bot,
}

export interface ProjectDuration {
  years: number
  months: number
}

// Arithmétique manuelle plutôt que date-fns, présente au projet pour la seule locale du Calendar
// shadcn : un affichage "X mois" / "X ans" ne justifie pas d'en étendre la surface. Les parts
// servent la vitrine (next-intl) et l'admin (français en dur). Pas d'horloge ici : l'appelant
// fournit la fin (la page prérendue de la vitrine ne peut pas la lire, d'où getLiveProjectDuration).
export function getProjectDuration(
  startedAt: Date | null,
  endedAt: Date | null,
): ProjectDuration | null {
  if (!startedAt || !endedAt) return null
  const end = endedAt
  // Zod refuse endedAt < startedAt, pas la base (edit SQL direct, donnée legacy) : une plage inversée
  // n'a pas de durée à afficher. Comparer les dates, pas le delta en mois : 20 mai → 1er mai a un delta de 0.
  if (end < startedAt) return null
  // Mois de début et de fin inclus, comme LinkedIn, pour recouper le profil. Lus en UTC, où les dates sont stockées à minuit.
  const totalMonths =
    (end.getUTCFullYear() - startedAt.getUTCFullYear()) * 12 +
    (end.getUTCMonth() - startedAt.getUTCMonth()) +
    1
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12 }
}

export function formatProjectDuration(
  startedAt: Date | null,
  endedAt: Date | null,
  now: Date,
): string | null {
  const duration = getProjectDuration(startedAt, endedAt ?? now)
  if (!duration) return null
  const { years, months } = duration
  const yearsLabel = years === 0 ? null : years === 1 ? "1 an" : `${years} ans`
  const monthsLabel = months === 0 ? null : `${months} mois`
  return [yearsLabel, monthsLabel].filter(Boolean).join(" ")
}

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
  duration: "Durée",
  githubUrl: "Lien GitHub",
  demoUrl: "Lien démo",
  companyId: "Entreprise",
  workMode: "Mode de travail",
  contractStatus: "Statut de contrat",
  teamSize: "Taille d'équipe",
  deliverablesCount: "Livrables",
} as const
