"use client"

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
import { getVisiblePages, PAGE_SIZE_OPTIONS } from "@/lib/pagination"
import { cn } from "@/lib/utils"

interface Props {
  count: number
  noun: string
  suffix?: string
  currentPage: number
  pageCount: number
  onPageChange: (page: number) => void
  rowsPerPage: number
  onRowsPerPageChange: (rowsPerPage: number) => void
}

export function PaginationFooter({
  count,
  noun,
  suffix,
  currentPage,
  pageCount,
  onPageChange,
  rowsPerPage,
  onRowsPerPageChange,
}: Props) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <span role="status" aria-live="polite" className="text-sm text-muted-foreground">
          {`${count} ${noun}${count > 1 ? "s" : ""}`}
          {suffix ? ` · ${suffix}` : null}
        </span>
        <Select
          value={String(rowsPerPage)}
          onValueChange={(value) => {
            onRowsPerPageChange(Number(value))
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
                onPageChange(Math.max(1, currentPage - 1))
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
                    onPageChange(entry)
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
                onPageChange(Math.min(pageCount, currentPage + 1))
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  )
}
