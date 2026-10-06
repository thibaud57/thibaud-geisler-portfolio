import type { ReactNode } from "react"

import type { Column } from "@/components/features/admin/DataTable"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { ACTIONS_COLUMN_WIDTH } from "@/lib/admin-table-widths"

// Fonction et non composant : DataTable ne pose EmptyValue que sur un null reçu, pas sur un élément qui rend null.
export function truncatedCell(value: string | null | undefined) {
  if (!value) return null
  return <TruncateTooltip className="block w-full">{value}</TruncateTooltip>
}

export function hideableColumn<K extends string>(
  defaults: readonly K[],
  key: K,
): { hideable: true; defaultVisible: boolean } {
  return { hideable: true, defaultVisible: defaults.includes(key) }
}

export function actionsColumn<T>(cell: (row: T) => ReactNode): Column<T> {
  return {
    key: "actions",
    header: "Actions",
    width: ACTIONS_COLUMN_WIDTH,
    align: "right",
    cell: (row) => <span className="inline-flex">{cell(row)}</span>,
  }
}
