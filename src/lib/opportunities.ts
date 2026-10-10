import { Archive, CircleCheck, CirclePause, CircleX, Clock, Hand, Inbox, Send } from "lucide-react"

import type { OpportunityStatus } from "@/generated/prisma/client"
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
  daysPerWeek: "Rythme",
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
