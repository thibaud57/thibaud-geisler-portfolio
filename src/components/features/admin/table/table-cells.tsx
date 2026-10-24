import { TruncateTooltip } from "@/components/features/admin/display/TruncateTooltip"
import type { ReactNode } from "react"
import type { Column } from "@/components/features/admin/table/DataTable"
import type { Facet } from "@/lib/admin/facets"
import { ACTIONS_COLUMN_WIDTH } from "@/lib/admin/table-widths"
import type { IconComponent } from "@/lib/icons"

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

export function enumFacet<T, V extends string, FacetKey extends string>(
  key: FacetKey,
  label: string,
  values: readonly V[],
  labels: Record<V, string>,
  pick: (row: T) => V | readonly V[] | null,
): Facet<T, FacetKey> {
  return {
    key,
    label,
    options: values.map((value) => ({ value, label: labels[value] })),
    values: (row) => {
      const picked = pick(row)
      return picked === null ? [] : typeof picked === "string" ? [picked] : picked
    },
  }
}

// Glyphe par libellé plutôt que par valeur : BadgeList ne connaît que les libellés déjà résolus.
export function iconsByLabel<V extends string>(
  values: readonly V[],
  labels: Record<V, string>,
  icons: Record<V, IconComponent | null>,
): Record<string, IconComponent | null> {
  return Object.fromEntries(values.map((value) => [labels[value], icons[value]]))
}
