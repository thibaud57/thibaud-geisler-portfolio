import type {
  ContractStatus,
  ProjectFormat,
  ProjectStatus,
  ProjectType,
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

// Pas de date-fns/dayjs au projet : arithmétique manuelle, suffisante pour un affichage "X mois" / "X ans".
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
