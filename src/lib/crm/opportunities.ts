import { Archive, CircleCheck, CirclePause, CircleX, Clock, Hand, Inbox, Send } from "lucide-react"

import type { OpportunityStatus } from "@/generated/prisma/client"
import { toLinkMarker } from "@/lib/crm/link-marker"
import type { IconComponent } from "@/lib/icons"

export const OPPORTUNITY_STATUS_LABELS: Record<OpportunityStatus, string> = {
  PROPOSEE: "Proposée",
  EN_PROCESS: "En process",
  OFFRE_RECUE: "Offre reçue",
  EN_PAUSE: "En pause",
  ACCEPTEE: "Acceptée",
  REFUSEE: "Refusée",
  DECLINEE: "Déclinée",
  ABANDONNEE: "Abandonnée",
}

export const OPPORTUNITY_STATUS_ICONS: Record<OpportunityStatus, IconComponent | null> = {
  PROPOSEE: Send,
  EN_PROCESS: Clock,
  OFFRE_RECUE: Inbox,
  EN_PAUSE: CirclePause,
  ACCEPTEE: CircleCheck,
  REFUSEE: CircleX,
  DECLINEE: Hand,
  ABANDONNEE: Archive,
}

export const OPPORTUNITY_FIELD_LABELS = {
  title: "Intitulé",
  role: "Rôle",
  status: "Statut",
  referrerId: "Apporteur",
  intermediaryId: "ESN",
  clientId: "Client final",
  dailyRate: "TJM",
  contract: "Contrat",
  workMode: "Mode de travail",
  daysPerWeek: "Jours par semaine",
  rhythm: "Rythme",
  onSiteDays: "Jours sur site",
  zone: "Localité",
  startMonth: "Démarrage",
  durationMonths: "Durée (mois)",
  notes: "Notes",
  details: "Détails",
} as const

// Relu en UTC : un fuseau à l'ouest de Greenwich reculerait sinon l'affichage au mois précédent.
const START_MONTH = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
})

export function formatStartMonth(date: Date | null): string | null {
  return date ? START_MONTH.format(date) : null
}

export function toMonthValue(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`
}

export const OPPORTUNITY_SECTION_TITLES = {
  opportunity: "Opportunité",
  conditions: "Conditions",
  calendar: "Calendrier",
  relations: "Relations",
  notes: "Notes",
  details: "Détails",
  interviews: "Entretiens",
} as const

export function formatDailyRate(rate: number | null): string | null {
  return rate === null ? null : `${rate} €`
}

export function formatDuration(months: number | null): string | null {
  return months === null ? null : `${months} mois`
}

export function formatDays(days: number): string
export function formatDays(days: number | null): string | null
export function formatDays(days: number | null): string | null {
  return days === null ? null : `${days} j`
}

export function formatRhythm(daysPerWeek: number | null, onSiteDays: number | null): string | null {
  const days = formatDays(daysPerWeek)
  if (days === null) return onSiteDays === null ? null : `${onSiteDays} j sur site`
  return onSiteDays === null ? days : `${days} dont ${onSiteDays} sur site`
}

export function toOpportunityLink(
  opportunity: {
    id: string
    title: string
    status: OpportunityStatus
    dailyRate: number | null
    startMonth: Date | null
    createdAt: Date
  },
  { href, metaSuffix, idPrefix }: { href: string; metaSuffix?: string | null; idPrefix?: string },
) {
  const status = OPPORTUNITY_STATUS_LABELS[opportunity.status]
  return {
    id: idPrefix ? `${idPrefix}-${opportunity.id}` : opportunity.id,
    href,
    label: opportunity.title,
    meta: metaSuffix ? `${status} · ${metaSuffix}` : status,
    trailing: formatDailyRate(opportunity.dailyRate) ?? undefined,
    at: opportunity.startMonth ?? opportunity.createdAt,
    marker: toLinkMarker(OPPORTUNITY_STATUS_ICONS[opportunity.status]),
  }
}
