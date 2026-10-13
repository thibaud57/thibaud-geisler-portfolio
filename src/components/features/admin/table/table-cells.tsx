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
import { cn } from "@/lib/utils"

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

interface CompanyRef {
  id: string
  name: string
  logoFilename: string | null
}

// Fonction et non composant, comme `truncatedCell` : DataTable ne pose EmptyValue que sur un null reçu.
export function companyCell(row: { company: CompanyRef | null }) {
  return row.company ? <CompanyLink company={row.company} /> : null
}

// Référence à une autre fiche de l'admin, la même en colonne et en vue détail : un visuel puis le
// libellé, un seul lien, en couleur du texte. Le vert reste aux liens qui sortent de l'admin. Sans
// fiche à ouvrir, la même référence reste en texte simple.
export function RecordLink({
  href,
  leading,
  children,
}: {
  href: ComponentProps<typeof Link>["href"] | null
  leading?: ReactNode
  children: string
}) {
  const content = (
    <>
      {leading}
      <TruncateTooltip
        className={cn("min-w-0", href && "underline-offset-4 group-hover:underline")}
      >
        {children}
      </TruncateTooltip>
    </>
  )
  const className = "group inline-flex max-w-full min-w-0 items-center gap-2"
  return href ? (
    <Link href={href} className={className}>
      {content}
    </Link>
  ) : (
    <span className={className}>{content}</span>
  )
}

export function CompanyLink({ company }: { company: CompanyRef }) {
  return (
    <RecordLink
      href={detailHref(ADMIN_COMPANIES_PATH, company.id)}
      leading={<CompanyLogoTile logoFilename={company.logoFilename} size="sm" />}
    >
      {company.name}
    </RecordLink>
  )
}

interface PersonRef {
  name: string | null
  email: string | null
  linkedinUrl: string | null
  company?: { logoFilename: string | null } | null
}

export function PersonRecordLink({
  person,
  href,
}: {
  person: PersonRef
  href: ComponentProps<typeof RecordLink>["href"]
}) {
  return (
    <RecordLink
      href={href}
      leading={
        person.company ? (
          <CompanyLogoTile logoFilename={person.company.logoFilename} size="sm" />
        ) : null
      }
    >
      {personDisplayName(person)}
    </RecordLink>
  )
}

// Une personne peut avoir perdu ses rôles Lead et Contact : sans fiche à ouvrir, son nom reste en texte simple.
export function PersonLink({
  person,
}: {
  person: PersonRef & {
    id: string
    lead: object | null
    contact: object | null
    optedOutAt?: Date | null
  }
}) {
  return (
    <span className="inline-flex max-w-full min-w-0 items-center gap-2">
      <PersonRecordLink person={person} href={personDetailHref(person)} />
      {person.optedOutAt ? <Badge variant="outline">{OPTED_OUT_LABEL}</Badge> : null}
    </span>
  )
}
