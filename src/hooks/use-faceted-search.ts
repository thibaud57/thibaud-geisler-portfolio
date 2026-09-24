import { useMemo, useState } from "react"

import type { FacetFilterGroup } from "@/components/features/admin/FacetFilter"
import { paginate, type PaginationResult } from "@/lib/pagination"

export interface FacetOption {
  value: string
  label: string
}

export interface Facet<T, K extends string = string> {
  key: string
  label: string
  options: readonly FacetOption[]
  // Scalaire ou tableau : la plupart des facettes portent une valeur unique par ligne, certaines
  // (ex. formats d'un projet) en portent plusieurs ; la ligne matche si l'une d'elles est sélectionnée.
  value: (row: T) => K | readonly K[]
}

// Array.isArray ne narrowe pas value: K | readonly K[] pour un K générique (TS ne peut pas prouver
// que K exclut les tableaux) : les deux branches restent castées explicitement, sûres au runtime.
function facetValues<T, K extends string>(facet: Facet<T, K>, row: T): readonly K[] {
  const value = facet.value(row)
  return Array.isArray(value) ? (value as readonly K[]) : [value as K]
}

interface Options<T, K extends string = string> {
  rows: readonly T[]
  matchesSearch: (row: T, search: string) => boolean
  facets?: readonly Facet<T, K>[]
  defaultFacetSelections?: Record<string, readonly string[]>
  initialSearch?: string
  pageSize: number
}

export function useFacetedSearch<T, K extends string = string>({
  rows,
  matchesSearch,
  facets,
  defaultFacetSelections,
  initialSearch = "",
  pageSize,
}: Options<T, K>) {
  const [search, setSearchState] = useState(initialSearch)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPageState] = useState(pageSize)
  const [facetSelections, setFacetSelections] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(
      Object.entries(defaultFacetSelections ?? {}).map(([key, values]) => [key, new Set(values)]),
    ),
  )

  const searchFilteredRows = useMemo(
    () => rows.filter((row) => matchesSearch(row, search)),
    [rows, search, matchesSearch],
  )

  const activeFacetCount = useMemo(
    () => Object.values(facetSelections).reduce((sum, values) => sum + values.size, 0),
    [facetSelections],
  )

  const filteredRows = useMemo(() => {
    if (!facets || activeFacetCount === 0) return searchFilteredRows
    return searchFilteredRows.filter((row) =>
      facets.every((facet) => {
        const selected = facetSelections[facet.key]
        return (
          !selected ||
          selected.size === 0 ||
          facetValues(facet, row).some((value) => selected.has(value))
        )
      }),
    )
  }, [searchFilteredRows, facets, facetSelections, activeFacetCount])

  // Un passage par facette (Map tallying) plutôt qu'un filter() par option : évite un coût en
  // O(lignes × options) à chaque re-render du consommateur (recherche, facette, pagination...).
  const facetGroups: readonly FacetFilterGroup[] = useMemo(() => {
    if (!facets) return []
    return facets.map((facet) => {
      const counts = new Map<string, number>()
      for (const row of searchFilteredRows) {
        for (const value of facetValues(facet, row)) {
          counts.set(value, (counts.get(value) ?? 0) + 1)
        }
      }
      return {
        key: facet.key,
        label: facet.label,
        options: facet.options.map((option) => ({
          value: option.value,
          label: option.label,
          count: counts.get(option.value) ?? 0,
        })),
      }
    })
  }, [facets, searchFilteredRows])

  function setSearch(next: string) {
    setSearchState(next)
    setPage(1)
  }

  function setRowsPerPage(next: number) {
    setRowsPerPageState(next)
    setPage(1)
  }

  function toggleFacet(groupKey: string, value: string) {
    setFacetSelections((prev) => {
      const next = { ...prev }
      const current = new Set(next[groupKey] ?? [])
      if (current.has(value)) current.delete(value)
      else current.add(value)
      next[groupKey] = current
      return next
    })
    setPage(1)
  }

  function resetFacets() {
    setFacetSelections({})
    setPage(1)
  }

  function resetSearchAndFacets() {
    setSearchState("")
    setFacetSelections({})
    setPage(1)
  }

  function paginateRows(items: readonly T[]): PaginationResult<T> {
    const result = paginate(items, page, rowsPerPage)
    if (page > result.pageCount) setPage(result.pageCount)
    return result
  }

  return {
    search,
    setSearch,
    page,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    facetSelections,
    activeFacetCount,
    filteredRows,
    facetGroups,
    toggleFacet,
    resetFacets,
    resetSearchAndFacets,
    paginate: paginateRows,
  }
}
