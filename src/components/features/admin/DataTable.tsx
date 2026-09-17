"use client"

import { useMemo, useState, type ReactNode } from "react"
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Une colonne est triable ou cherchable par la seule présence de son accesseur : sans flag à
// tenir en phase, une colonne déclarée triable sans comparateur est impossible à écrire.
export interface Column<T> {
  key: string
  header: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  searchValue?: (row: T) => string
}

type SortDirection = "asc" | "desc"
type SortState = { key: string; direction: SortDirection } | null

const PAGE_SIZE_OPTIONS = [10, 20, 50] as const

interface Props<T> {
  rows: readonly T[]
  columns: readonly Column<T>[]
  getRowId: (row: T) => string
  // Restreint aux options du sélecteur : une autre valeur laisserait son libellé vide.
  pageSize?: (typeof PAGE_SIZE_OPTIONS)[number]
  empty: ReactNode
}

function edgePadding(index: number, count: number) {
  return cn(index === 0 && "pl-4", index === count - 1 && "pr-4")
}

export function DataTable<T>({ rows, columns, getRowId, pageSize = 20, empty }: Props<T>) {
  const [search, setSearch] = useState("")
  const [sort, setSort] = useState<SortState>(null)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(pageSize)

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return rows
    return rows.filter((row) =>
      columns.some((column) => column.searchValue?.(row).toLowerCase().includes(query)),
    )
  }, [rows, search, columns])

  const sortedRows = useMemo(() => {
    if (!sort) return filteredRows
    const column = columns.find((candidate) => candidate.key === sort.key)
    if (!column?.sortValue) return filteredRows
    const { sortValue } = column
    const direction = sort.direction === "asc" ? 1 : -1
    return [...filteredRows].sort((a, b) => {
      const valueA = sortValue(a)
      const valueB = sortValue(b)
      if (valueA < valueB) return -1 * direction
      if (valueA > valueB) return direction
      return 0
    })
  }, [filteredRows, sort, columns])

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / rowsPerPage))
  // Recalé pendant le rendu et non seulement borné à l'affichage : une page devenue hors limite
  // après une suppression resurgirait sinon dès que la liste regrossit.
  if (page > pageCount) setPage(pageCount)
  const currentPage = Math.min(page, pageCount)
  const paginatedRows = sortedRows.slice((currentPage - 1) * rowsPerPage, currentPage * rowsPerPage)

  function handleSort(key: string) {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: "asc" }
      if (current.direction === "asc") return { key, direction: "desc" }
      return null
    })
    setPage(1)
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
    <Card className="gap-0 py-0">
      <div className="border-b p-4">
        <Input
          type="search"
          placeholder="Rechercher"
          aria-label="Rechercher"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value)
            setPage(1)
          }}
          className="max-w-xs"
        />
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column, index) => (
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
                className={edgePadding(index, columns.length)}
              >
                {column.sortValue ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="-ml-2.5"
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
                ) : (
                  column.header
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {paginatedRows.length === 0 ? (
            <TableRow>
              <TableCell
                colSpan={columns.length}
                className="h-24 pr-4 pl-4 text-center text-muted-foreground"
              >
                Aucun résultat pour cette recherche.
              </TableCell>
            </TableRow>
          ) : (
            paginatedRows.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((column, index) => (
                  <TableCell key={column.key} className={edgePadding(index, columns.length)}>
                    {column.cell(row)}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <CardFooter className="flex-col items-stretch justify-between gap-3 text-xs sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span>
            {sortedRows.length} ligne{sortedRows.length > 1 ? "s" : ""}
          </span>
          <Select
            value={String(rowsPerPage)}
            onValueChange={(value) => {
              setRowsPerPage(Number(value))
              setPage(1)
            }}
          >
            <SelectTrigger size="xs" aria-label="Lignes par page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PAGE_SIZE_OPTIONS.map((option) => (
                <SelectItem key={option} value={String(option)}>
                  {option} / page
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Pagination className="mx-0 w-fit">
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
      </CardFooter>
    </Card>
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
