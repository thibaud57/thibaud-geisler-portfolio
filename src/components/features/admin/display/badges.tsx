import type { ComponentProps } from "react"
import { EnumBadge } from "@/components/features/admin/display/EnumBadge"
import { Badge } from "@/components/ui/badge"
import type { ContractStatus, WorkMode, Zone } from "@/generated/prisma/client"
import type { IconComponent } from "@/lib/icons"
import {
  CONTRACT_STATUS_ICONS,
  CONTRACT_STATUS_LABELS,
  WORK_MODE_ICONS,
  WORK_MODE_LABELS,
} from "@/lib/contract-terms"
import { ZONE_LABELS } from "@/lib/crm/zones"

// Sans glyphe : Poste et Localité ne figurent pas dans la table des glyphes d'énumération.
export function labelBadge(label: string | null) {
  return label ? <Badge variant="secondary">{label}</Badge> : null
}

type BadgeProps = Omit<ComponentProps<typeof Badge>, "children">

export const HEADER_BADGE_PROPS: BadgeProps = { variant: "outline", meta: true }

export function enumBadge<V extends string>(
  value: V | null,
  labels: Record<V, string>,
  icons: Record<V, IconComponent | null>,
  badgeProps?: BadgeProps,
) {
  return value ? <EnumBadge label={labels[value]} icon={icons[value]} {...badgeProps} /> : null
}

export function contractBadge(opportunity: { contract: ContractStatus | null }) {
  return enumBadge(opportunity.contract, CONTRACT_STATUS_LABELS, CONTRACT_STATUS_ICONS)
}

export function workModeBadge(opportunity: { workMode: WorkMode | null }) {
  return enumBadge(opportunity.workMode, WORK_MODE_LABELS, WORK_MODE_ICONS)
}

export function zoneBadge({ zone }: { zone: Zone | null }) {
  return labelBadge(zone ? ZONE_LABELS[zone] : null)
}
