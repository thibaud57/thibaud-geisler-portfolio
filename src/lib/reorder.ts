// L'id déplacé prend la position qu'occupait la cible avant le déplacement, comme une saisie de
// cette position dans le champ Ordre : vers le bas, la cible remonte d'un cran.
export function computeReorderedIds(
  ids: readonly string[],
  draggedId: string,
  targetId: string,
): string[] {
  const targetIndex = ids.indexOf(targetId)
  if (draggedId === targetId || targetIndex === -1) return [...ids]

  return computeIdsAtPosition(ids, draggedId, targetIndex + 1)
}

export function sameIdSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false
  const setB = new Set(b)
  return a.every((id) => setB.has(id))
}

// Un seul chemin pour insertion et déplacement : l'id est d'abord retiré s'il est déjà présent
// (déplacement), ce qui ramène les deux cas au même calcul de borne (withoutId.length + 1).
export function computeIdsAtPosition(
  ids: readonly string[],
  id: string,
  position: number,
): string[] {
  const withoutId = ids.filter((existingId) => existingId !== id)
  const clampedPosition = Math.min(Math.max(position, 1), withoutId.length + 1)
  const index = clampedPosition - 1

  return [...withoutId.slice(0, index), id, ...withoutId.slice(index)]
}

export function removeId(ids: readonly string[], id: string): string[] {
  return ids.filter((existingId) => existingId !== id)
}

export interface RenumberedEdit<TData> {
  id: string
  data: TData
}

// Réécrit la suite en entier, et pas seulement les éléments décalés : elle reste continue de 1 à n
// même si la base contenait un trou avant l'appel. L'élément édité reçoit ses champs avec sa position.
// `update` construit la mutation propre à chaque client Prisma (tag, project...) : ça évite de
// figer ici la forme exacte de `where`/`data` qu'exige chaque delegate généré.
export function renumberEntities<TData extends object, TResult>(
  update: (id: string, data: TData | { displayOrder: number }) => TResult,
  orderedIds: readonly string[],
  edited?: RenumberedEdit<TData>,
): TResult[] {
  return orderedIds.map((id, index) => {
    const displayOrder = index + 1
    return update(id, id === edited?.id ? { ...edited.data, displayOrder } : { displayOrder })
  })
}
