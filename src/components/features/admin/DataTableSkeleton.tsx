import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

const CELL_WIDTHS = ["w-8", "w-24", "w-32", "w-28", "w-20", "w-28", "w-10", "w-16"] as const

interface Props {
  rows?: number
}

export function DataTableSkeleton({ rows = 8 }: Props) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="h-8 w-full max-w-[320px]" />

      <Card className="gap-0 py-0">
        <Table className="table-fixed">
          <TableBody>
            {Array.from({ length: rows }, (_, rowIndex) => (
              <TableRow key={rowIndex}>
                {CELL_WIDTHS.map((width, cellIndex) => (
                  <TableCell key={cellIndex}>
                    <Skeleton className={cn("h-3.5", width)} />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>
  )
}
