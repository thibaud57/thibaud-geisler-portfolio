import {
  Hand,
  Megaphone,
  Merge,
  MessageSquareText,
  Mic,
  Package,
  PenLine,
  RotateCcw,
  TrendingUp,
  Users,
} from "lucide-react"

import type { Signal, SignalType } from "@/generated/prisma/client"
import type { Facet } from "@/hooks/use-faceted-search"
import { formatDateOnly } from "@/lib/date-time"
import type { IconComponent } from "@/lib/icons"

export const COMPANY_SIGNAL_TYPES = [
  "OFFRE_POSTE",
  "LEVEE",
  "EXPANSION",
  "NOUVEAU_PRODUIT",
  "PIVOT",
  "ACQUISITION",
] as const satisfies readonly SignalType[]

export const LEAD_SIGNAL_TYPES = [
  "POST",
  "COMMENTAIRE",
  "CONFERENCE",
  "INTERACTION",
] as const satisfies readonly SignalType[]

export type SignalOwnerKind = "company" | "lead"

export interface SignalOwner {
  kind: SignalOwnerKind
  id: string
  name: string
}

export type SignalItem = Pick<Signal, "id" | "type" | "occurredOn" | "content" | "sourceUrl">

export function signalTypesFor(kind: SignalOwnerKind): readonly SignalType[] {
  return kind === "company" ? COMPANY_SIGNAL_TYPES : LEAD_SIGNAL_TYPES
}

export const SIGNAL_TYPE_LABELS: Record<SignalType, string> = {
  OFFRE_POSTE: "Offre de poste",
  LEVEE: "Levée",
  EXPANSION: "Expansion d'équipe",
  NOUVEAU_PRODUIT: "Nouveau produit",
  PIVOT: "Pivot",
  ACQUISITION: "Acquisition",
  POST: "Post engageant",
  COMMENTAIRE: "Commentaire",
  CONFERENCE: "Présence en conférence",
  INTERACTION: "Interaction directe",
}

export const SIGNAL_TYPE_ICONS: Record<SignalType, IconComponent | null> = {
  OFFRE_POSTE: Megaphone,
  LEVEE: TrendingUp,
  EXPANSION: Users,
  NOUVEAU_PRODUIT: Package,
  PIVOT: RotateCcw,
  ACQUISITION: Merge,
  POST: PenLine,
  COMMENTAIRE: MessageSquareText,
  CONFERENCE: Mic,
  INTERACTION: Hand,
}

export const SIGNAL_FIELD_LABELS = {
  type: "Type",
  occurredOn: "Date",
  content: "Contenu",
  sourceUrl: "Lien source",
} as const

export function formatSignalDate(signal: { occurredOn: Date }): string {
  return formatDateOnly(signal.occurredOn)
}

export function signalLabel(signal: SignalItem): string {
  return `${SIGNAL_TYPE_LABELS[signal.type]} · ${formatSignalDate(signal)}`
}

export type SignalFreshness = "RECENT" | "A_CONFIRMER" | "PERIME"

export const SIGNAL_FRESHNESS_LABELS: Record<SignalFreshness, string> = {
  RECENT: "Récent",
  A_CONFIRMER: "À confirmer",
  PERIME: "Périmé",
}

// Décote temporelle des signaux, en mois : fin de « récent », fin de « à confirmer » ;
// absente pour les types non notés.
const FRESHNESS_MONTHS: Partial<Record<SignalType, readonly [number, number]>> = {
  OFFRE_POSTE: [3, 6],
  LEVEE: [6, 18],
  EXPANSION: [6, 12],
  NOUVEAU_PRODUIT: [6, 12],
}

function addUtcMonths(date: Date, months: number): Date {
  const year = date.getUTCFullYear()
  const month = date.getUTCMonth() + months
  // Jour 0 du mois suivant : dernier jour du mois cible, qui borne le 31 d'un mois plus court.
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate()
  return new Date(Date.UTC(year, month, Math.min(date.getUTCDate(), lastDay)))
}

export function signalFreshness(
  signal: { type: SignalType; occurredOn: Date },
  now: Date,
): SignalFreshness | null {
  const bounds = FRESHNESS_MONTHS[signal.type]
  if (!bounds) return null
  const [recentMonths, toConfirmMonths] = bounds
  if (now < addUtcMonths(signal.occurredOn, recentMonths)) return "RECENT"
  if (now < addUtcMonths(signal.occurredOn, toConfirmMonths)) return "A_CONFIRMER"
  return "PERIME"
}

export function hasRecentSignal(
  signals: readonly { type: SignalType; occurredOn: Date }[],
  now: Date,
): boolean {
  return signals.some((signal) => signalFreshness(signal, now) === "RECENT")
}

export function signalFacet<T extends { signals: readonly SignalItem[] }>(now: Date): Facet<T> {
  return {
    key: "signal",
    label: "Signal",
    options: [{ value: "recent", label: "Récent" }],
    value: (row) => (hasRecentSignal(row.signals, now) ? ["recent"] : []),
  }
}
