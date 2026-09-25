import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"

// Motif répété sur l'index de colonne, pas une valeur par colonne : casse l'aspect pavé d'une
// ligne de barres identiques sans écrire une seconde largeur pour chaque colonne.
const BAR_WIDTH_PATTERN = ["w-full", "w-2/3", "w-4/5"] as const

interface Props {
  // Largeurs (px) des colonnes réellement rendues par l'écran, calculées par la page depuis
  // src/lib/admin-table-widths.ts : sans elles, le squelette annonce un nombre et des largeurs de
  // colonnes qui ne correspondent pas à la table qui arrive, et la page se réorganise au chargement.
  columnWidths: readonly number[]
  rows?: number
}

export function DataTableSkeleton({ columnWidths, rows = 8 }: Props) {
  return (
    <div className="flex flex-col gap-2" aria-hidden>
      <Skeleton className="h-8 w-full max-w-[320px]" />

      <Card className="gap-0 py-0">
        <div className="overflow-x-auto">
          <Table className="table-fixed">
            <TableBody>
              {Array.from({ length: rows }, (_, rowIndex) => (
                <TableRow key={rowIndex}>
                  {columnWidths.map((width, cellIndex) => (
                    <TableCell
                      key={cellIndex}
                      // table-fixed ne lit que la première ligne pour dimensionner les colonnes :
                      // poser la largeur uniquement ici évite une largeur dupliquée sur chaque ligne.
                      style={rowIndex === 0 ? { width } : undefined}
                    >
                      <Skeleton
                        className={cn(
                          "h-3.5",
                          BAR_WIDTH_PATTERN[cellIndex % BAR_WIDTH_PATTERN.length],
                        )}
                      />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-6 w-32" />
      </div>
    </div>
  )
}
