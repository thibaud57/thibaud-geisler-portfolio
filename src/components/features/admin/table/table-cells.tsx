import type { ComponentProps, ReactNode } from "react"
import Link from "next/link"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import type { Column, Facet } from "@/components/features/admin/table/DataTable"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { Badge } from "@/components/ui/badge"
import type { ContractStatus, WorkMode, Zone } from "@/generated/prisma/client"
import { detailHref } from "@/lib/admin/detail-links"
import { ADMIN_COMPANIES_PATH } from "@/lib/admin/routes"
import { ACTIONS_COLUMN_WIDTH } from "@/lib/admin/table-widths"
import { personDetailHref } from "@/lib/crm/person-links"
import { OPTED_OUT_LABEL, personDisplayName } from "@/lib/crm/persons"
import type { IconComponent } from "@/lib/icons"
import {
  CONTRACT_STATUS_ICONS,
  CONTRACT_STATUS_LABELS,
  WORK_MODE_ICONS,
  WORK_MODE_LABELS,
} from "@/lib/projects"
import { ZONE_LABELS } from "@/lib/crm/zones"
import { STANDALONE_LINK_CLASS } from "@/lib/typography"

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

export function enumFacet<T, V extends string>(
  key: string,
  label: string,
  values: readonly V[],
  labels: Record<V, string>,
  pick: (row: T) => V | readonly V[] | null,
): Facet<T> {
  return {
    key,
    label,
    options: values.map((value) => ({ value, label: labels[value] })),
    value: (row) => pick(row) ?? [],
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

interface PersonLinkProps {
  person: {
    id: string
    name: string | null
    email: string | null
    linkedinUrl: string | null
    lead: object | null
    contact: object | null
    optedOutAt?: Date | null
  }
  children?: ReactNode
}

// Une personne peut avoir perdu ses rôles Lead et Contact : sans fiche à ouvrir, son nom reste en texte simple.
export function PersonLink({ person, children = personDisplayName(person) }: PersonLinkProps) {
  const href = personDetailHref(person)
  return (
    <span className="inline-flex items-center gap-1">
      {href ? (
        <Link href={href} className={STANDALONE_LINK_CLASS}>
          {children}
        </Link>
      ) : (
        <span>{children}</span>
      )}
      {person.optedOutAt ? <Badge variant="outline">{OPTED_OUT_LABEL}</Badge> : null}
    </span>
  )
}

export function CompanyLink({ company }: { company: { id: string; name: string } }) {
  return (
    <Link href={detailHref(ADMIN_COMPANIES_PATH, company.id)} className={STANDALONE_LINK_CLASS}>
      {company.name}
    </Link>
  )
}
