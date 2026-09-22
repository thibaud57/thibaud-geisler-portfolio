"use client"

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ComponentProps,
  type DragEvent,
  type ReactNode,
} from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown, Columns3 } from "lucide-react"
import { toast } from "sonner"

import { ORDER_COLUMN_WIDTH } from "@/lib/admin-table-widths"
import { EmptyState, type EmptyStateContent } from "@/components/features/admin/EmptyState"
import { EmptyValue } from "@/components/features/admin/EmptyValue"
import { FacetFilter } from "@/components/features/admin/FacetFilter"
import { OptionsPopover } from "@/components/features/admin/OptionsPopover"
import { PaginationFooter } from "@/components/features/admin/PaginationFooter"
import { SearchInput } from "@/components/features/admin/SearchInput"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS, paginate } from "@/lib/pagination"
import { computeReorderedIds, sameIdSet } from "@/lib/reorder"
import { LABEL_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"

const UNGROUPED_KEY = "__all__"

// Construit une fois au chargement du module : la collation FR sert tous les tris de toutes les
// instances de DataTable, sans reconstruction par rendu ni par paire comparée. Le classement par
// points de code de `<`/`>` mettrait les mots accentués après Z ("Épreuve" après "Zèbre").
const FR_COLLATOR = new Intl.Collator("fr")

// Un clic dans la colonne Actions (ou tout autre contrôle interactif de la ligne) ne doit pas
// ouvrir le détail de la ligne : ses propres boutons/liens gèrent déjà leur clic.
function isInteractiveClickTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest("button, a, [role='button']") !== null
}

// Une colonne est triable ou cherchable par la seule présence de son accesseur : sans flag à
// tenir en phase, une colonne déclarée triable sans comparateur est impossible à écrire.
export interface Column<T> {
  key: string
  header: string
  // Pixels, posés en style inline sur le <th> : sous table-fixed, seule la première ligne dimensionne
  // les colonnes, donc pas de largeur dupliquée sur les <td>. Un nombre plutôt qu'une classe Tailwind
  // arbitraire rend les largeurs sommables et bannit le pourcentage, qui s'écrase à 0 dès que les
  // colonnes voisines saturent le tableau.
  width: number
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

// Le retour commun des actions de réordonnancement : DataTable garde ou annule l'ordre optimiste
// et porte lui-même le message, l'écran ne fait que passer son action.
export type ReorderResult = { ok: true } | { ok: false; message: string }

type SortDirection = "asc" | "desc"
type SortState = { key: string; direction: SortDirection } | null
type RenderItem<T, K extends string> =
  { type: "row"; row: T } | { type: "group"; key: K; count: number }

interface Props<T, K extends string = string> {
  rows: readonly T[]
  columns: readonly Column<T>[]
  getRowId: (row: T) => string
  // Omis : pas de colonne #, pas de groupement ni de drag-and-drop ; l'ordre d'affichage est celui des lignes reçues.
  orderValue?: (row: T) => number
  empty: EmptyStateContent
  searchPlaceholder: string
  noun: string
  // Restreint aux options du sélecteur : une autre valeur laisserait son libellé vide.
  pageSize?: (typeof PAGE_SIZE_OPTIONS)[number]
  groupBy?: GroupBy<T, K>
  facets?: readonly Facet<T, K>[]
  defaultFacetSelections?: Record<string, readonly string[]>
  onReorder?: (groupKey: K, orderedRowIds: string[]) => Promise<ReorderResult>
  onRowClick?: (row: T) => void
  // DataTable ignore la sémantique des colonnes : l'écran fournit le nom qui identifie la ligne
  // (titre de projet, nom de tag, nom d'entreprise) pour que le tabIndex ajouté par onRowClick
  // porte une annonce lecteur d'écran, pas un arrêt muet.
  rowLabel?: (row: T) => string
}

export function DataTable<T, K extends string = string>({
  rows,
  columns,
  getRowId,
  orderValue,
  empty,
  searchPlaceholder,
  noun,
  pageSize = DEFAULT_PAGE_SIZE,
  groupBy,
  facets,
  defaultFacetSelections,
  onReorder,
  onRowClick,
  rowLabel,
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
  // Ref et non state : un clic parasite après un drop (Firefox notamment) ne doit pas déclencher
  // onRowClick sans provoquer de re-render à chaque glisser-déposer.
  const justDraggedRef = useRef(false)

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
        return (
          !selected ||
          selected.size === 0 ||
          facetValues(facet, row).some((value) => selected.has(value))
        )
      }),
    )
  }, [searchFilteredRows, facets, facetSelections, activeFacetCount])

  // Un passage par facette (Map tallying) plutôt qu'un filter() par option : searchFilteredRows
  // recompte à chaque changement de page/tri/colonnes/drag, pas seulement à chaque recherche.
  const facetGroups = useMemo(() => {
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
      if (typeof valueA === "string" && typeof valueB === "string") {
        return FR_COLLATOR.compare(valueA, valueB) * direction
      }
      if (valueA < valueB) return -1 * direction
      if (valueA > valueB) return direction
      return 0
    })
  }, [isOrderView, groupedView, sort, facetFilteredRows, visibleColumns])

  const {
    currentPage,
    pageCount,
    pageItems: paginatedRows,
  } = paginate(sortedRows, page, rowsPerPage)
  if (page > pageCount) setPage(pageCount)

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

  function resetSearchAndFacets() {
    setSearch("")
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
    // Différé : un clic parasite consécutif au drop arrive dans la même passe d'événements que
    // dragend, avant ce timeout ; un clic normal ultérieur arrive après.
    window.setTimeout(() => {
      justDraggedRef.current = false
    }, 0)
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
        const result = await onReorder(targetGroupKey, nextIds)
        ok = result.ok
        if (!result.ok) {
          toast.error(
            result.message === "stale_order"
              ? "La liste a changé entre-temps. Rechargez la page."
              : "Le nouvel ordre n'a pas pu être enregistré.",
          )
        }
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
        style={{ width: column.width }}
        className={cn(
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

  function buildDragRowProps(
    row: T,
    rowId: string,
    draggable: boolean,
  ): Pick<
    ComponentProps<typeof TableRow>,
    "draggable" | "onDragStart" | "onDragOver" | "onDragEnd" | "onDrop"
  > {
    if (!draggable) return {}
    return {
      draggable: true,
      onDragStart: () => {
        setDraggedId(rowId)
        setDraggedGroupKey(effectiveGroupKey(row))
        justDraggedRef.current = true
      },
      onDragOver: (event) => {
        if (draggedGroupKey !== effectiveGroupKey(row)) return
        event.preventDefault()
        setDragOverId(rowId)
      },
      onDragEnd: handleDragEnd,
      onDrop: (event) => {
        handleDrop(event, row)
      },
    }
  }

  // role="row" reste natif : chaque ligne imbrique de vrais contrôles (lien, bouton, tooltip),
  // interdits dans un role="button". aria-label annonce l'action pour l'arrêt clavier que crée
  // tabIndex, à défaut d'un rôle qui le ferait lui-même.
  function buildClickRowProps(
    row: T,
  ): Pick<ComponentProps<typeof TableRow>, "tabIndex" | "aria-label" | "onClick" | "onKeyDown"> {
    if (!onRowClick) return {}
    return {
      tabIndex: 0,
      "aria-label": rowLabel ? `Voir le détail : ${rowLabel(row)}` : undefined,
      onClick: (event) => {
        if (justDraggedRef.current) return
        // React fait bulle un portail (AlertDialog, Tooltip, Popover…) le long de l'arbre React,
        // pas du DOM : un clic dans son contenu atteint ce onClick sans jamais croiser la ligne
        // dans le DOM réel. `contains` l'exclut avant même de tester l'interactivité.
        if (!event.currentTarget.contains(event.target as Node)) return
        if (isInteractiveClickTarget(event.target)) return
        onRowClick(row)
      },
      onKeyDown: (event) => {
        if (event.target !== event.currentTarget) return
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        onRowClick(row)
      },
    }
  }

  function renderDataRow(row: T) {
    const rowId = getRowId(row)
    const draggable = isOrderView && hasOrderColumn && !!onReorder
    const isValidDropTarget = draggable && draggedGroupKey === effectiveGroupKey(row)
    return (
      <TableRow
        key={rowId}
        {...buildDragRowProps(row, rowId, draggable)}
        {...buildClickRowProps(row)}
        className={cn(
          draggable ? "cursor-grab" : onRowClick && "cursor-pointer",
          isValidDropTarget && dragOverId === rowId && "bg-muted",
        )}
      >
        {orderValue ? (
          <TableCell className="pr-1 pl-4 font-mono text-muted-foreground">
            {/* positionById recontiguïse 1..N sur les lignes reçues, correct seulement si elles couvrent
                tout l'ordre : sur un sous-ensemble filtré (vue Client/Perso), la valeur d'ordre réelle
                doit s'afficher telle quelle. */}
            {onReorder
              ? (groupedView?.positionById.get(rowId) ?? orderValue(row))
              : orderValue(row)}
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
            {column.cell(row) ?? <EmptyValue />}
          </TableCell>
        ))}
      </TableRow>
    )
  }

  // Texte commun à toutes les listes admin : un écart de formulation d'un écran à l'autre se lirait
  // comme une différence de comportement. Seule l'icône reste celle de l'écran.
  const effectiveEmptyFiltered: EmptyStateContent = {
    icon: empty.icon,
    title: "Aucun résultat ne correspond à ces filtres",
    description: "Essayez une autre recherche ou modifiez les filtres actifs.",
  }

  if (rows.length === 0) {
    // border-solid : les surfaces admin utilisent une bordure pleine, pas le border-dashed par
    // défaut d'Empty (laissé intact pour un futur usage qui le voudrait).
    return <EmptyState {...empty} className="border border-solid" />
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder={searchPlaceholder}
        />

        {hideableColumns.length > 0 ? (
          <OptionsPopover
            icon={Columns3}
            label="Colonnes"
            groups={[
              {
                key: "columns",
                title: "Colonnes affichées",
                options: hideableColumns.map((column) => ({
                  key: column.key,
                  label: column.header,
                  checked: !hiddenColumnKeys.has(column.key),
                })),
              },
            ]}
            onToggle={(_groupKey, key) => {
              toggleColumn(key)
            }}
            resetDisabled={isDefaultColumnState}
            onReset={resetColumns}
            open={columnsOpen}
            onOpenChange={setColumnsOpen}
          />
        ) : null}

        {facets && facets.length > 0 ? (
          <FacetFilter
            groups={facetGroups}
            selected={facetSelections}
            onToggle={toggleFacetValue}
            onReset={resetFacets}
            open={filterOpen}
            onOpenChange={setFilterOpen}
          />
        ) : null}
      </div>

      <div>
        <Card className="gap-0 py-0">
          <div className="overflow-x-auto">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow>
                  {hasOrderColumn ? (
                    <TableHead
                      style={{ width: ORDER_COLUMN_WIDTH }}
                      className="pr-1 pl-4 font-mono"
                    >
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
                      className="p-0 whitespace-normal"
                    >
                      <EmptyState {...effectiveEmptyFiltered} onReset={resetSearchAndFacets} />
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
      </div>

      {facetFilteredRows.length > 0 ? (
        <PaginationFooter
          count={facetFilteredRows.length}
          noun={noun}
          currentPage={currentPage}
          pageCount={pageCount}
          onPageChange={setPage}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(value) => {
            setRowsPerPage(value)
            setPage(1)
          }}
        />
      ) : null}
    </div>
  )
}
