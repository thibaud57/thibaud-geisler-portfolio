// Module sans "use client" : partagé entre les tables clientes (DataTable) et les pages serveur
// (DataTableSkeleton), pour que le squelette ne dérive jamais silencieusement de la table. Chaque
// liste garde ses largeurs à côté de sa table.

export const ORDER_COLUMN_WIDTH = 40

// Une seule largeur pour toutes les listes : l'en-tête « Actions » (74 px) dépasse ses deux boutons (64 px).
export const ACTIONS_COLUMN_WIDTH = 80

export function skeletonWidths<K extends string>(
  widths: Record<K | "actions", number>,
  leadKeys: readonly K[],
  visible: readonly K[],
): readonly number[] {
  return [...leadKeys, ...visible, "actions" as const].map((key) => widths[key])
}
