import type { OpportunityStatus } from "@/generated/prisma/client"
import { nullsLastBy } from "@/lib/crm/sort"

export const OPPORTUNITY_VIEWS = ["en-cours", "acceptees", "all"] as const

export type OpportunityView = (typeof OPPORTUNITY_VIEWS)[number]

interface OpportunityViewRow {
  status: OpportunityStatus
  startMonth: Date | null
  updatedAt: Date
}

export const ONGOING: ReadonlySet<OpportunityStatus> = new Set([
  "PROPOSEE",
  "EN_PROCESS",
  "OFFRE_RECUE",
])

const VIEW_FILTERS: Record<OpportunityView, (opportunity: OpportunityViewRow) => boolean> = {
  "en-cours": (opportunity) => ONGOING.has(opportunity.status),
  acceptees: (opportunity) => opportunity.status === "ACCEPTEE",
  all: () => true,
}

const byStartMonth = (direction: 1 | -1) =>
  nullsLastBy<OpportunityViewRow>((opportunity) => opportunity.startMonth, direction)

function byLatestUpdate(a: OpportunityViewRow, b: OpportunityViewRow): number {
  return b.updatedAt.getTime() - a.updatedAt.getTime()
}

const VIEW_SORTS: Record<
  OpportunityView,
  (a: OpportunityViewRow, b: OpportunityViewRow) => number
> = {
  "en-cours": byStartMonth(1),
  acceptees: byStartMonth(-1),
  all: byLatestUpdate,
}

// Ordre d'affichage par défaut : DataTable garde celui des lignes reçues tant qu'aucune colonne n'est triée.
export function opportunitiesForView<T extends OpportunityViewRow>(
  opportunities: readonly T[],
  view: OpportunityView,
): T[] {
  return opportunities.filter(VIEW_FILTERS[view]).sort(VIEW_SORTS[view])
}

export const OPPORTUNITY_VIEW_LOCKED_FACETS: Partial<Record<OpportunityView, readonly string[]>> = {
  acceptees: ["status"],
}

export const OPPORTUNITY_VIEW_PAGES: Record<OpportunityView, { title: string; subtitle: string }> =
  {
    "en-cours": {
      title: "Opportunités en cours",
      subtitle: "Opportunités proposées, en process ou avec une offre reçue.",
    },
    acceptees: {
      title: "Opportunités acceptées",
      subtitle: "Opportunités gagnées, point de départ du suivi de mission.",
    },
    all: {
      title: "Toutes les opportunités",
      subtitle: "Toutes les opportunités, en pause et closes comprises.",
    },
  }
