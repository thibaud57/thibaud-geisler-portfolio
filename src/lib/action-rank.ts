import type { ActionStatus } from "@/generated/prisma/client"
import { byOccurredAtAsc } from "@/lib/action-views"

interface RankedActionRow {
  id: string
  personId: string
  status: ActionStatus
  occurredAt: Date
  createdAt: Date
}

// Pas de champ stocké : une relance se reconnaît à la chronologie des actions déjà envoyées à la même personne, ce qui reste juste quand une action est ajoutée, supprimée ou redatée.
export function rankActions(actions: readonly RankedActionRow[]): Map<string, number> {
  const byPerson = new Map<string, RankedActionRow[]>()
  for (const action of actions) {
    const list = byPerson.get(action.personId) ?? []
    list.push(action)
    byPerson.set(action.personId, list)
  }

  const ranks = new Map<string, number>()
  for (const list of byPerson.values()) {
    list.sort(byOccurredAtAsc)
    let sentBefore = 0
    for (const action of list) {
      ranks.set(action.id, sentBefore)
      if (action.status !== "A_FAIRE") sentBefore += 1
    }
  }
  return ranks
}

export function rankLabel(count: number): string {
  return count === 0 ? "Premier contact" : `Relance ${count}`
}
