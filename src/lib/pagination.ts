export type PaginationEntry = number | "ellipsis"

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const

export const DEFAULT_PAGE_SIZE: (typeof PAGE_SIZE_OPTIONS)[number] = 25

export interface PaginationResult<T> {
  currentPage: number
  pageCount: number
  pageItems: T[]
}

// Recalculé à chaque rendu plutôt que dans un effet : un effet ne corrigerait la page qu'au rendu
// suivant, affichant une tranche vide entre-temps. L'appelant doit quand même rappeler `setPage`
// avec `pageCount` quand `page` le dépasse, sans quoi la page hors limite ressurgirait dès que la
// liste regrossit (recherche relâchée, filtre retiré, élément recréé).
export function paginate<T>(
  items: readonly T[],
  page: number,
  pageSize: number,
): PaginationResult<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pageItems = items.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  return { currentPage, pageCount, pageItems }
}

// Fenêtre de pages du seul bloc de pagination du projet (PaginationFooter, table comme grille de
// tuiles). Toujours cinq emplacements au-delà de cinq pages, pour que le bloc ne change jamais de
// largeur quand on navigue : c'est ce qui coûte les voisines de la page courante en position
// médiane, où seules les flèches permettent d'avancer d'une page.
export function getVisiblePages(current: number, total: number): PaginationEntry[] {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  if (current <= 3) return [1, 2, 3, "ellipsis", total]
  if (current >= total - 2) return [1, "ellipsis", total - 2, total - 1, total]
  return [1, "ellipsis", current, "ellipsis", total]
}
