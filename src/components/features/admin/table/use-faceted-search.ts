import { useMemo, useState } from "react"

import type { Facet, FacetFilterGroup } from "@/lib/admin/facets"
import { paginate, type PaginationResult } from "@/lib/admin/pagination"
import { toggled } from "@/lib/toggled"

interface Options<T, FacetKey extends string = string> {
  rows: readonly T[]
  matchesSearch: (row: T, search: string) => boolean
  facets?: readonly Facet<T, FacetKey>[]
  defaultFacetSelections?: Record<string, readonly string[]>
  initialSearch?: string
  pageSize: number
}

export function useFacetedSearch<T, FacetKey extends string = string>({
  rows,
  matchesSearch,
  facets,
  defaultFacetSelections,
  initialSearch = "",
  pageSize,
}: Options<T, FacetKey>) {
  const [search, setSearchState] = useState(initialSearch)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPageState] = useState(pageSize)
  const [facetSelections, setFacetSelections] = useState<
    Readonly<Record<string, ReadonlySet<string>>>
  >(() =>
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
          !selected || selected.size === 0 || facet.values(row).some((value) => selected.has(value))
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
        for (const value of facet.values(row)) {
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
      const current = prev[groupKey] ?? new Set<string>()
      return { ...prev, [groupKey]: toggled(current, value) }
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
