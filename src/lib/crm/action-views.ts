import type { ActionChannel, ActionStatus } from "@/generated/prisma/client"

export const ACTION_VIEWS = [
  "a-faire",
  "connexions",
  "discussions",
  "candidatures",
  "journal",
] as const

export type ActionView = (typeof ACTION_VIEWS)[number]

interface ActionViewRow {
  status: ActionStatus
  channel: ActionChannel
  occurredAt: Date
  createdAt: Date
}

const MESSAGE_CHANNELS: ReadonlySet<ActionChannel> = new Set([
  "DM_LINKEDIN",
  "EMAIL",
  "SMS_WHATSAPP",
])

const VIEW_FILTERS: Record<ActionView, (action: ActionViewRow) => boolean> = {
  "a-faire": (action) => action.status === "A_FAIRE",
  connexions: (action) => action.channel === "CONNEXION_LINKEDIN" && action.status === "FAIT",
  discussions: (action) => MESSAGE_CHANNELS.has(action.channel) && action.status === "FAIT",
  candidatures: (action) => action.channel === "CANDIDATURE" && action.status === "FAIT",
  journal: () => true,
}

interface ChronologicalRow {
  occurredAt: Date
  createdAt: Date
}

export function byOccurredAtAsc(a: ChronologicalRow, b: ChronologicalRow): number {
  return (
    a.occurredAt.getTime() - b.occurredAt.getTime() || a.createdAt.getTime() - b.createdAt.getTime()
  )
}

function byOccurredAtDesc(a: ChronologicalRow, b: ChronologicalRow): number {
  return byOccurredAtAsc(b, a)
}

export function groupByPersonRecentFirst<T extends ChronologicalRow & { personId: string }>(
  actions: readonly T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const action of [...actions].sort(byOccurredAtDesc)) {
    const list = map.get(action.personId) ?? []
    list.push(action)
    map.set(action.personId, list)
  }
  return map
}

function toDoFirstThenRecent(a: ActionViewRow, b: ActionViewRow): number {
  const rank = (action: ActionViewRow) => (action.status === "A_FAIRE" ? 0 : 1)
  return rank(a) - rank(b) || byOccurredAtDesc(a, b)
}

// À faire du plus ancien au plus récent : les retards d'abord, puis les prochaines échéances.
const VIEW_SORTS: Record<ActionView, (a: ActionViewRow, b: ActionViewRow) => number> = {
  "a-faire": byOccurredAtAsc,
  connexions: byOccurredAtDesc,
  discussions: byOccurredAtDesc,
  candidatures: byOccurredAtDesc,
  journal: toDoFirstThenRecent,
}

// L'ordre rendu ici est l'ordre d'affichage par défaut : DataTable garde celui des lignes reçues tant qu'aucune colonne n'est triée.
export function actionsForView<T extends ActionViewRow>(
  actions: readonly T[],
  view: ActionView,
): T[] {
  return actions.filter(VIEW_FILTERS[view]).sort(VIEW_SORTS[view])
}

export const ACTION_VIEW_LOCKED_FACETS: Partial<Record<ActionView, readonly string[]>> = {
  "a-faire": ["status"],
  connexions: ["status", "channel"],
  discussions: ["status"],
  candidatures: ["status", "channel"],
}

export const ACTION_VIEW_PAGES: Record<ActionView, { title: string; subtitle: string }> = {
  "a-faire": {
    title: "Actions à faire",
    subtitle: "Prochaines actions à exécuter, les plus urgentes en premier.",
  },
  connexions: {
    title: "Connexions",
    subtitle:
      "Connexions LinkedIn envoyées, en attente d'acceptation. Au-delà de J+14 sans suite, passer le lead en stand-by.",
  },
  discussions: {
    title: "Discussions",
    subtitle: "DM, emails et SMS envoyés en attente de réponse, à relancer selon la séquence.",
  },
  candidatures: {
    title: "Candidatures",
    subtitle: "Candidatures envoyées en attente de retour RH. Ignoré si aucun contact relançable.",
  },
  journal: {
    title: "Journal des actions",
    subtitle: "Journal complet : À faire en premier, puis du plus récent au plus ancien.",
  },
}
