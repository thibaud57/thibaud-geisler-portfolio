import type { LeadInterest } from "@/generated/prisma/client"
import {
  leadDisplayStatus,
  type LeadDisplayStatus,
  type LeadStatusSource,
} from "@/lib/crm/lead-display-status"
import { personDisplayName } from "@/lib/crm/persons"

export const LEAD_VIEWS = ["en-cours", "chauds", "a-qualifier", "stand-by", "all"] as const

export type LeadView = (typeof LEAD_VIEWS)[number]

interface LeadViewRow extends LeadStatusSource {
  interest: LeadInterest | null
  optedOutAt: Date | null
  metAt: Date | null
  name: string | null
  email: string | null
  linkedinUrl: string | null
}

const IN_PROGRESS: ReadonlySet<LeadDisplayStatus> = new Set([
  "NOUVEAU",
  "SUSPECT",
  "DISCUSSION",
  "RDV_PLANIFIE",
])

// Une fiche en opposition n'est jamais active, quel que soit le statut saisi, et un lead Deal sort du pipeline : la règle est partagée par tout écran qui distingue les leads actifs.
export function isActiveLead(
  lead: Pick<LeadViewRow, "status" | "opportunities" | "interviews" | "optedOutAt">,
  now: number,
): boolean {
  return !lead.optedOutAt && IN_PROGRESS.has(leadDisplayStatus(lead, now))
}

const VIEW_FILTERS: Record<
  Exclude<LeadView, "all">,
  (lead: LeadViewRow, now: number) => boolean
> = {
  "en-cours": (lead, now) => IN_PROGRESS.has(leadDisplayStatus(lead, now)),
  chauds: (lead, now) => lead.interest === "HOT" && IN_PROGRESS.has(leadDisplayStatus(lead, now)),
  "a-qualifier": (lead, now) => leadDisplayStatus(lead, now) === "NOUVEAU",
  "stand-by": (lead, now) => leadDisplayStatus(lead, now) === "STAND_BY",
}

// Date absente en dernier dans les deux sens : un lead jamais rencontré n'est ni le plus récent ni le plus ancien.
function byMetAt(direction: 1 | -1) {
  return (a: LeadViewRow, b: LeadViewRow): number => {
    if (!a.metAt || !b.metAt) return a.metAt ? -1 : b.metAt ? 1 : 0
    return direction * (a.metAt.getTime() - b.metAt.getTime())
  }
}

// Opposées en dernier : elles ne se travaillent plus. Les fiches en opposition n'ont plus de nom : sans le repli sur l'email ou le LinkedIn (`personDisplayName`), elles resteraient à égalité dans l'ordre de la base.
function byName(a: LeadViewRow, b: LeadViewRow): number {
  if (!a.optedOutAt && b.optedOutAt) return -1
  if (a.optedOutAt && !b.optedOutAt) return 1
  return personDisplayName(a).localeCompare(personDisplayName(b), "fr")
}

const VIEW_SORTS: Record<LeadView, (a: LeadViewRow, b: LeadViewRow) => number> = {
  "en-cours": byMetAt(-1),
  chauds: byMetAt(-1),
  "a-qualifier": byMetAt(1),
  "stand-by": byMetAt(1),
  all: byName,
}

// Une fiche en opposition n'a plus rien à faire dans une vue de travail : seul Tous la montre, pour vérifier une opposition ou effacer ses échanges après coup.
// L'ordre rendu ici est l'ordre d'affichage par défaut : DataTable garde celui des lignes reçues tant qu'aucune colonne n'est triée.
export function leadsForView<T extends LeadViewRow>(
  leads: readonly T[],
  view: LeadView,
  now: number,
): T[] {
  return leads
    .filter((lead) => view === "all" || (!lead.optedOutAt && VIEW_FILTERS[view](lead, now)))
    .sort(VIEW_SORTS[view])
}

export const LEAD_VIEW_LOCKED_FACETS: Partial<Record<LeadView, readonly string[]>> = {
  chauds: ["interest"],
  "a-qualifier": ["status"],
  "stand-by": ["status"],
}

export const LEAD_VIEW_PAGES: Record<LeadView, { title: string; subtitle: string }> = {
  "en-cours": {
    title: "Leads en cours",
    subtitle:
      "Pipeline actif : Nouveau, Suspect, Discussion, RDV planifié. Plus récents en premier.",
  },
  chauds: {
    title: "Leads chauds",
    subtitle: "Intérêt fort dans le pipeline actif. Priorité commerciale maximale.",
  },
  "a-qualifier": {
    title: "Leads à qualifier",
    subtitle: "Créés sans qualification, à requalifier. Les plus anciens d'abord.",
  },
  "stand-by": {
    title: "Leads en stand-by",
    subtitle: "Parqués en sommeil, à réanimer hors séquence dans 2 à 6 mois avec un angle nouveau.",
  },
  all: {
    title: "Tous les leads",
    subtitle: "Sans filtre, fiches « Ne plus contacter » comprises, triés par nom.",
  },
}
