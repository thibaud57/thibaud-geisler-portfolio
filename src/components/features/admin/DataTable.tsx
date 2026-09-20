"use client"

import {
  useCallback,
  useMemo,
  useState,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3, Funnel, Search } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { computeReorderedIds, sameIdSet } from "@/lib/reorder"
import { LABEL_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"

const UNGROUPED_KEY = "__all__"

// Pastille compacte de la maquette (16px, texte 10px) : le badge par défaut alourdirait un bouton sm.
const COUNTER_BADGE_CLASS = "h-4 min-w-4 px-[5px] text-[10px] leading-none"

// Une colonne est triable ou cherchable par la seule présence de son accesseur : sans flag à
// tenir en phase, une colonne déclarée triable sans comparateur est impossible à écrire.
export interface Column<T> {
  key: string
  header: string
  width: string
  align?: "right"
  className?: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  searchValue?: (row: T) => string
  hideable?: boolean
  defaultVisible?: boolean
  // Colonne purement visuelle (ex. logo en tuile) : le header existe pour l'accessibilité sans
  // occuper de place, contrairement à un header vide qui casserait la lecture du tableau au lecteur d'écran.
  headerSrOnly?: boolean
}

export interface GroupBy<T, K extends string = string> {
  key: (row: T) => K
  order: readonly K[]
  label: (key: K) => ReactNode
}

export interface FacetOption {
  value: string
  label: string
}

export interface Facet<T, K extends string = string> {
  key: string
  label: string
  options: readonly FacetOption[]
  value: (row: T) => K
}

type SortDirection = "asc" | "desc"
type SortState = { key: string; direction: SortDirection } | null
type RenderItem<T, K extends string> =
  { type: "row"; row: T } | { type: "group"; key: K; count: number }

const PAGE_SIZE_OPTIONS = [5, 10, 25, 50, 100] as const

interface Props<T, K extends string = string> {
  rows: readonly T[]
  columns: readonly Column<T>[]
  getRowId: (row: T) => string
  // Omis : pas de colonne #, pas de groupement ni de drag-and-drop ; l'ordre d'affichage est celui des lignes reçues.
  orderValue?: (row: T) => number
  empty: ReactNode
  searchPlaceholder: string
  countLabel: (count: number) => string
  // Restreint aux options du sélecteur : une autre valeur laisserait son libellé vide.
  pageSize?: (typeof PAGE_SIZE_OPTIONS)[number]
  groupBy?: GroupBy<T, K>
  facets?: readonly Facet<T, K>[]
  defaultFacetSelections?: Record<string, readonly string[]>
  onReorder?: (groupKey: K, orderedRowIds: string[]) => Promise<boolean>
}

export function DataTable<T, K extends string = string>({
  rows,
  columns,
  getRowId,
  orderValue,
  empty,
  searchPlaceholder,
  countLabel,
  pageSize = 25,
  groupBy,
  facets,
  defaultFacetSelections,
  onReorder,
}: Props<T, K>) {
  const hasOrderColumn = orderValue !== undefined
  const colSpanOffset = hasOrderColumn ? 1 : 0

  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(pageSize)
  const [filterOpen, setFilterOpen] = useState(false)
  const [facetSelections, setFacetSelections] = useState<Record<string, Set<string>>>(() =>
    Object.fromEntries(
      Object.entries(defaultFacetSelections ?? {}).map(([key, values]) => [key, new Set(values)]),
    ),
  )
  const [orderOverrides, setOrderOverrides] = useState<Record<string, string[]>>({})
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [draggedGroupKey, setDraggedGroupKey] = useState<K | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [, startReorderTransition] = useTransition()

  const hideableColumns = useMemo(() => columns.filter((column) => column.hideable), [columns])
  const defaultHiddenColumnKeys = useMemo(
    () =>
      hideableColumns
        .filter((column) => column.defaultVisible === false)
        .map((column) => column.key),
    [hideableColumns],
  )
  const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(
    () => new Set(defaultHiddenColumnKeys),
  )
  const [columnsOpen, setColumnsOpen] = useState(false)

  const visibleColumns = useMemo(
    () => columns.filter((column) => !hiddenColumnKeys.has(column.key)),
    [columns, hiddenColumnKeys],
  )
  const visibleHideableCount = hideableColumns.length - hiddenColumnKeys.size
  const isDefaultColumnState = sameIdSet([...hiddenColumnKeys], defaultHiddenColumnKeys)

  const searchFilteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) =>
      visibleColumns.some((column) => column.searchValue?.(row).toLowerCase().includes(query)),
    )
  }, [rows, search, visibleColumns])

  const activeFacetCount = useMemo(
    () => Object.values(facetSelections).reduce((sum, values) => sum + values.size, 0),
    [facetSelections],
  )

  const facetFilteredRows = useMemo(() => {
    if (!facets || activeFacetCount === 0) return searchFilteredRows
    return searchFilteredRows.filter((row) =>
      facets.every((facet) => {
        const selected = facetSelections[facet.key]
        return !selected || selected.size === 0 || selected.has(facet.value(row))
      }),
    )
  }, [searchFilteredRows, facets, facetSelections, activeFacetCount])

  const isOrderView = !sort && search.trim() === "" && activeFacetCount === 0

  // K vaut string (sa valeur par défaut) quand groupBy est omis, seul cas où ce sentinel est utilisé :
  // TypeScript ne peut pas déduire cette corrélation entre deux props optionnelles indépendantes sans
  // un type conditionnel disproportionné pour ce détail interne à DataTable.
  const effectiveGroupKey = useCallback(
    (row: T): K => (groupBy ? groupBy.key(row) : (UNGROUPED_KEY as K)),
    [groupBy],
  )

  const groupedView = useMemo(() => {
    if (!isOrderView || !orderValue) return null
    const byId = new Map(facetFilteredRows.map((row) => [getRowId(row), row]))
    const groupKeys: readonly K[] = groupBy ? groupBy.order : [UNGROUPED_KEY as K]
    const idsByGroup: Record<string, string[]> = {}
    const positionById = new Map<string, number>()
    const flatRows: T[] = []

    for (const key of groupKeys) {
      const idsInGroup = facetFilteredRows
        .filter((row) => effectiveGroupKey(row) === key)
        .sort((a, b) => orderValue(a) - orderValue(b))
        .map(getRowId)
      const override = orderOverrides[key]
      const finalIds = override && sameIdSet(override, idsInGroup) ? override : idsInGroup
      idsByGroup[key] = finalIds
      finalIds.forEach((id, index) => {
        positionById.set(id, index + 1)
        const row = byId.get(id)
        if (row) flatRows.push(row)
      })
    }

    // Filet pour une ligne dont la clé de groupe n'appartient pas à groupBy.order : sans lui,
    // une catégorie oubliée dans l'ordre configuré ferait disparaître silencieusement ses tags.
    const knownIds = new Set(Object.values(idsByGroup).flat())
    const leftover = facetFilteredRows
      .filter((row) => !knownIds.has(getRowId(row)))
      .sort((a, b) => orderValue(a) - orderValue(b))
    flatRows.push(...leftover)

    return { flatRows, idsByGroup, positionById }
  }, [
    isOrderView,
    facetFilteredRows,
    groupBy,
    orderValue,
    getRowId,
    orderOverrides,
    effectiveGroupKey,
  ])

  const sortedRows = useMemo(() => {
    if (isOrderView) return groupedView?.flatRows ?? facetFilteredRows
    if (!sort) return facetFilteredRows
    // visibleColumns et non columns : un tri sur une colonne masquée entre-temps (ex. Réinitialiser
    // qui la re-masque) doit retomber sur l'ordre d'affichage plutôt que trier par une valeur invisible.
    const column = visibleColumns.find((candidate) => candidate.key === sort.key)
    if (!column?.sortValue) return facetFilteredRows
    const { sortValue } = column
    const direction = sort.direction === "asc" ? 1 : -1
    return [...facetFilteredRows].sort((a, b) => {
      const valueA = sortValue(a)
      const valueB = sortValue(b)
      if (valueA < valueB) return -1 * direction
      if (valueA > valueB) return direction
      return 0
    })
  }, [isOrderView, groupedView, sort, facetFilteredRows, visibleColumns])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage))
  // Recalé pendant le rendu et non seulement borné à l'affichage : une page devenue hors limite
  // après une suppression resurgirait sinon dès que la liste regrossit.
  if (page > pageCount) setPage(pageCount)
  const currentPage = Math.min(page, pageCount)
  const paginatedRows = sortedRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  const renderItems = useMemo((): RenderItem<T, K>[] => {
    if (!isOrderView || !groupBy || !hasOrderColumn) {
      return paginatedRows.map((row) => ({ type: "row", row }))
    }
    const items: RenderItem<T, K>[] = []
    let previousKey: K | null = null
    for (const row of paginatedRows) {
      const key = groupBy.key(row)
      if (key !== previousKey) {
        const count = rows.filter((candidate) => groupBy.key(candidate) === key).length
        items.push({ type: "group", key, count })
        previousKey = key
      }
      items.push({ type: "row", row })
    }
    return items
  }, [isOrderView, groupBy, hasOrderColumn, paginatedRows, rows])

  function handleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" }
      if (current.direction === "asc") return { key, direction: "desc" }
      return null
    })
    setPage(1)
  }

  function toggleFacetValue(facetKey: string, value: string) {
    setFacetSelections((prev) => {
      const next = { ...prev }
      const current = new Set(next[facetKey] ?? [])
      if (current.has(value)) current.delete(value)
      else current.add(value)
      next[facetKey] = current
      return next
    })
    setPage(1)
  }

  function resetFacets() {
    setFacetSelections({})
    setPage(1)
  }

  function toggleColumn(key: string) {
    const isHiding = !hiddenColumnKeys.has(key)
    setHiddenColumnKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
    // Hors updater (StrictMode le rejoue) : une colonne masquée ne peut pas rester triée.
    if (isHiding) setSort((current) => (current?.key === key ? null : current))
  }

  function resetColumns() {
    setHiddenColumnKeys(new Set(defaultHiddenColumnKeys))
    if (sort && defaultHiddenColumnKeys.includes(sort.key)) setSort(null)
  }

  function handleDragEnd() {
    setDraggedId(null)
    setDraggedGroupKey(null)
    setDragOverId(null)
  }

  function handleDrop(event: DragEvent<HTMLTableRowElement>, row: T) {
    event.preventDefault()
    const targetGroupKey = effectiveGroupKey(row)
    const targetId = getRowId(row)
    if (!draggedId || !onReorder || draggedGroupKey !== targetGroupKey) {
      handleDragEnd()
      return
    }

    const currentIds = groupedView?.idsByGroup[targetGroupKey] ?? []
    const nextIds = computeReorderedIds(currentIds, draggedId, targetId)
    const previousOverride = orderOverrides[targetGroupKey]
    setOrderOverrides((prev) => ({ ...prev, [targetGroupKey]: nextIds }))
    handleDragEnd()

    startReorderTransition(async () => {
      let ok = false
      // finally : une action qui lève (session expirée) doit aussi rendre l'ordre réel à l'écran.
      try {
        ok = await onReorder(targetGroupKey, nextIds)
      } finally {
        if (!ok) {
          setOrderOverrides((prev) => {
            if (previousOverride) return { ...prev, [targetGroupKey]: previousOverride }
            const { [targetGroupKey]: _removed, ...rest } = prev
            return rest
          })
        }
      }
    })
  }

  function renderHeaderCell(column: Column<T>, isFirst: boolean, isLast: boolean) {
    const alignRight = column.align === "right"
    return (
      <TableHead
        key={column.key}
        aria-sort={
          !column.sortValue
            ? undefined
            : sort?.key === column.key
              ? sort.direction === "asc"
                ? "ascending"
                : "descending"
              : "none"
        }
        className={cn(
          column.width,
          alignRight && "text-right",
          // Sans colonne # (hasOrderColumn faux), la première colonne visible porte elle-même le 16px de bord de Card.
          isFirst && !hasOrderColumn && "pl-4",
          isLast && "pr-4",
        )}
      >
        {column.sortValue ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={alignRight ? "-mr-2.5" : "-ml-2.5"}
            onClick={() => {
              handleSort(column.key)
            }}
          >
            {column.header}
            {sort?.key === column.key ? (
              sort.direction === "asc" ? (
                <ArrowUp aria-hidden data-icon="inline-end" />
              ) : (
                <ArrowDown aria-hidden data-icon="inline-end" />
              )
            ) : (
              <ChevronsUpDown
                aria-hidden
                data-icon="inline-end"
                className="text-muted-foreground"
              />
            )}
          </Button>
        ) : column.headerSrOnly ? (
          <span className="sr-only">{column.header}</span>
        ) : (
          column.header
        )}
      </TableHead>
    )
  }

  function renderDataRow(row: T) {
    const rowId = getRowId(row)
    const draggable = isOrderView && hasOrderColumn && !!onReorder
    const isValidDropTarget = draggable && draggedGroupKey === effectiveGroupKey(row)
    return (
      <TableRow
        key={rowId}
        draggable={draggable}
        onDragStart={
          draggable
            ? () => {
                setDraggedId(rowId)
                setDraggedGroupKey(effectiveGroupKey(row))
              }
            : undefined
        }
        onDragOver={
          draggable
            ? (event) => {
                if (draggedGroupKey !== effectiveGroupKey(row)) return
                event.preventDefault()
                setDragOverId(rowId)
              }
            : undefined
        }
        onDragEnd={draggable ? handleDragEnd : undefined}
        onDrop={
          draggable
            ? (event) => {
                handleDrop(event, row)
              }
            : undefined
        }
        className={cn(
          draggable && "cursor-grab",
          isValidDropTarget && dragOverId === rowId && "bg-muted",
        )}
      >
        {orderValue ? (
          <TableCell className="pr-1 pl-4 font-mono text-muted-foreground">
            {/* Position affichée plutôt que displayOrder : suit le glisser-déposer avant la réponse du serveur. */}
            {groupedView?.positionById.get(rowId) ?? orderValue(row)}
          </TableCell>
        ) : null}
        {visibleColumns.map((column, index) => (
          <TableCell
            key={column.key}
            className={cn(
              column.align === "right" && "text-right",
              index === 0 && !hasOrderColumn && "pl-4",
              index === visibleColumns.length - 1 && "pr-4",
              column.className,
            )}
          >
            {column.cell(row)}
          </TableCell>
        ))}
      </TableRow>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          {empty}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-[320px] min-w-[200px] flex-1">
          <Search
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            value={search}
            onChange={(event) => {
              setSearch(event.target.value)
              setPage(1)
            }}
            className="pl-[34px]"
          />
        </div>

        {hideableColumns.length > 0 ? (
          <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                // La pastille finit le bouton : son padding droit plein la décollerait du bord
                // deux fois plus que le gap qui la précède.
                className={cn(visibleHideableCount > 0 && "pr-1.5")}
              >
                <Columns3 aria-hidden data-icon="inline-start" />
                Colonnes
                {visibleHideableCount > 0 ? (
                  <Badge variant="default" className={COUNTER_BADGE_CLASS}>
                    {visibleHideableCount}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="gap-0">
              <div className={cn(LABEL_CLASS, "mb-2")}>Colonnes affichées</div>
              <div className="grid gap-[2px]">
                {hideableColumns.map((column) => {
                  const checked = !hiddenColumnKeys.has(column.key)
                  return (
                    <label
                      key={column.key}
                      className="-mx-2 flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => {
                          toggleColumn(column.key)
                        }}
                      />
                      <span>{column.header}</span>
                    </label>
                  )
                })}
              </div>
              <Separator className="mt-3 mb-2" />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDefaultColumnState}
                  onClick={resetColumns}
                >
                  Réinitialiser
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setColumnsOpen(false)
                  }}
                >
                  Appliquer
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}

        {facets && facets.length > 0 ? (
          <Popover open={filterOpen} onOpenChange={setFilterOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn(activeFacetCount > 0 && "pr-1.5")}
              >
                <Funnel aria-hidden data-icon="inline-start" />
                Filtres
                {activeFacetCount > 0 ? (
                  <Badge variant="default" className={COUNTER_BADGE_CLASS}>
                    {activeFacetCount}
                  </Badge>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="gap-0">
              {facets.map((facet) => (
                <div key={facet.key}>
                  <div className={cn(LABEL_CLASS, "mb-2")}>{facet.label}</div>
                  <div className="grid gap-[2px]">
                    {facet.options.map((option) => {
                      const count = searchFilteredRows.filter(
                        (row) => facet.value(row) === option.value,
                      ).length
                      const checked = facetSelections[facet.key]?.has(option.value) ?? false
                      return (
                        <label
                          key={option.value}
                          className="-mx-2 flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={() => {
                              toggleFacetValue(facet.key, option.value)
                            }}
                          />
                          <span>{option.label}</span>
                          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
                            {count}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              ))}
              <Separator className="mt-3 mb-2" />
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={activeFacetCount === 0}
                  onClick={resetFacets}
                >
                  Réinitialiser
                </Button>
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={() => {
                    setFilterOpen(false)
                  }}
                >
                  Appliquer
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        ) : null}
      </div>

      <Card className="gap-0 py-0">
        <div className="overflow-x-auto">
          <Table className="min-w-[720px] table-fixed">
            <TableHeader>
              <TableRow>
                {hasOrderColumn ? (
                  <TableHead className="w-[52px] pr-1 pl-4 font-mono">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-2.5 font-mono"
                      title="Revenir à l'ordre d'affichage"
                      onClick={() => {
                        setSort(null)
                        setPage(1)
                      }}
                    >
                      #
                    </Button>
                  </TableHead>
                ) : null}
                {visibleColumns.map((column, index) =>
                  renderHeaderCell(column, index === 0, index === visibleColumns.length - 1),
                )}
              </TableRow>
            </TableHeader>
            <TableBody>
              {facetFilteredRows.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={visibleColumns.length + colSpanOffset}
                    className="h-24 pr-4 pl-4 text-center text-muted-foreground"
                  >
                    Aucun résultat pour cette recherche.
                  </TableCell>
                </TableRow>
              ) : (
                renderItems.map((item) =>
                  item.type === "group" ? (
                    <TableRow key={`group-${item.key}`}>
                      <TableCell
                        colSpan={visibleColumns.length + colSpanOffset}
                        className="bg-muted/50 px-4 py-2"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <span className={LABEL_CLASS}>{groupBy?.label(item.key)}</span>
                          <span className={LABEL_CLASS}>- {item.count}</span>
                        </span>
                      </TableCell>
                    </TableRow>
                  ) : (
                    renderDataRow(item.row)
                  ),
                )
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {facetFilteredRows.length > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
              {countLabel(facetFilteredRows.length)}
            </span>
            <Select
              value={String(rowsPerPage)}
              onValueChange={(value) => {
                setRowsPerPage(Number(value))
                setPage(1)
              }}
            >
              <SelectTrigger size="xs" aria-label="Lignes par page" className="w-16">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((option) => (
                  <SelectItem key={option} value={String(option)}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Pagination className="mx-0 w-auto justify-end">
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  text=""
                  aria-label="Page précédente"
                  size="icon-xs"
                  aria-disabled={currentPage === 1}
                  tabIndex={currentPage === 1 ? -1 : undefined}
                  className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
                  onClick={(event) => {
                    event.preventDefault()
                    setPage((current) => Math.max(1, current - 1))
                  }}
                />
              </PaginationItem>
              {getVisiblePages(currentPage, pageCount).map((entry, index) =>
                entry === "ellipsis" ? (
                  <PaginationItem key={`ellipsis-${index}`}>
                    <PaginationEllipsis />
                  </PaginationItem>
                ) : (
                  <PaginationItem key={entry}>
                    <PaginationLink
                      href="#"
                      size="icon-xs"
                      isActive={entry === currentPage}
                      onClick={(event) => {
                        event.preventDefault()
                        setPage(entry)
                      }}
                    >
                      {entry}
                    </PaginationLink>
                  </PaginationItem>
                ),
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  text=""
                  aria-label="Page suivante"
                  size="icon-xs"
                  aria-disabled={currentPage === pageCount}
                  tabIndex={currentPage === pageCount ? -1 : undefined}
                  className={cn(currentPage === pageCount && "pointer-events-none opacity-50")}
                  onClick={(event) => {
                    event.preventDefault()
                    setPage((current) => Math.min(pageCount, current + 1))
                  }}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      ) : null}
    </div>
  )
}

function getVisiblePages(current: number, total: number): ("ellipsis" | number)[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index + 1)

  const pinned = new Set([1, 2, total - 1, total, current - 1, current, current + 1])
  const pages = [...pinned].filter((page) => page >= 1 && page <= total).sort((a, b) => a - b)

  const result: ("ellipsis" | number)[] = []
  let previous = 0
  for (const page of pages) {
    if (previous && page - previous > 1) result.push("ellipsis")
    result.push(page)
    previous = page
  }
  return result
}
