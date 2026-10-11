import type { ReactNode } from "react"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import type { Column } from "@/components/features/admin/DataTable"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { Badge } from "@/components/ui/badge"
import type { ContractStatus, WorkMode, Zone } from "@/generated/prisma/client"
import { ACTIONS_COLUMN_WIDTH } from "@/lib/admin-table-widths"
import type { IconComponent } from "@/lib/icons"
import {
  CONTRACT_STATUS_ICONS,
  CONTRACT_STATUS_LABELS,
  WORK_MODE_ICONS,
  WORK_MODE_LABELS,
} from "@/lib/projects"
import { ZONE_LABELS } from "@/lib/zones"

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

// Sans glyphe : Poste et Localité ne figurent pas dans la table des glyphes d'énumération.
export function labelBadge(label: string | null) {
  return label ? <Badge variant="secondary">{label}</Badge> : null
}

export function enumBadge<V extends string>(
  value: V | null,
  labels: Record<V, string>,
  icons: Record<V, IconComponent | null>,
) {
  return value ? <EnumBadge label={labels[value]} icon={icons[value]} /> : null
}

export function contractBadge(opportunity: { contract: ContractStatus | null }) {
  return enumBadge(opportunity.contract, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_ICONS)
}

export function workModeBadge(opportunity: { workMode: WorkMode | null }) {
  return enumBadge(opportunity.workMode, WORK_MODE_LABELS, WORK_MODE_ICONS)
}

export function zoneBadge(opportunity: { zone: Zone | null }) {
  return labelBadge(opportunity.zone ? ZONE_LABELS[opportunity.zone] : null)
}

export function linkedinLink(person: { linkedinUrl: string | null }) {
  return person.linkedinUrl ? (
    <ExternalUrl url={person.linkedinUrl} className="wrap-anywhere" />
  ) : null
}

export function companyCell(person: {
  company: { name: string; logoFilename: string | null } | null
}) {
  if (!person.company) return null
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CompanyLogoTile logoFilename={person.company.logoFilename} size="sm" />
      <TruncateTooltip className="min-w-0">{person.company.name}</TruncateTooltip>
    </span>
  )
}
