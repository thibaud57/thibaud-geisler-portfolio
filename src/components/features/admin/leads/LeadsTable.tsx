"use client"

import { useMemo, useState, type ComponentProps } from "react"
import { Pencil, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import {
  actionsColumn,
  hideableColumn,
  truncatedCell,
} from "@/components/features/admin/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteLeadDialog } from "@/components/features/admin/leads/DeleteLeadDialog"
import { ErasePersonExchangesDialog } from "@/components/features/admin/persons/ErasePersonExchangesDialog"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import { LEAD_COLUMN_WIDTHS, LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS } from "@/lib/admin-table-widths"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import { leadsForView, type LeadView } from "@/lib/lead-views"
import {
  LEAD_CHANNEL_ICONS,
  LEAD_CHANNEL_LABELS,
  LEAD_FIELD_LABELS,
  LEAD_INTEREST_ICONS,
  LEAD_INTEREST_LABELS,
  LEAD_ORIGIN_ICONS,
  LEAD_ORIGIN_LABELS,
  LEAD_SECTION_TITLES,
  LEAD_STATUS_ICONS,
  LEAD_STATUS_LABELS,
} from "@/lib/leads"
import {
  OPTED_OUT_LABEL,
  PERSON_FIELD_LABELS,
  PERSON_SECTION_TITLES,
  personDisplayName,
} from "@/lib/persons"
import { formatShortDate } from "@/lib/projects"
import { LEAD_INTERESTS, LEAD_ORIGINS, LEAD_STATUSES } from "@/lib/schemas/lead"
import { STANDALONE_LINK_CLASS } from "@/lib/typography"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminLead } from "@/server/queries/leads"

// Sans glyphe : Poste et Localité ne figurent pas dans la table des glyphes d'énumération.
function labelBadge(label: string | null) {
  return label ? <Badge variant="secondary">{label}</Badge> : null
}

function interestBadge(lead: AdminLead) {
  if (!lead.interest) return null
  return (
    <EnumBadge
      label={LEAD_INTEREST_LABELS[lead.interest]}
      icon={LEAD_INTEREST_ICONS[lead.interest]}
    />
  )
}

function originBadge(lead: AdminLead) {
  return <EnumBadge label={LEAD_ORIGIN_LABELS[lead.origin]} icon={LEAD_ORIGIN_ICONS[lead.origin]} />
}

function channelBadge(lead: AdminLead) {
  if (!lead.channel) return null
  return (
    <EnumBadge label={LEAD_CHANNEL_LABELS[lead.channel]} icon={LEAD_CHANNEL_ICONS[lead.channel]} />
  )
}

function statusBadge(lead: AdminLead, badgeProps?: Omit<ComponentProps<typeof Badge>, "children">) {
  if (lead.optedOutAt) {
    return (
      <Badge variant="outline" {...badgeProps}>
        {OPTED_OUT_LABEL}
      </Badge>
    )
  }
  return (
    <EnumBadge
      label={LEAD_STATUS_LABELS[lead.status]}
      icon={LEAD_STATUS_ICONS[lead.status]}
      {...badgeProps}
    />
  )
}

function linkedinLink(lead: AdminLead) {
  return lead.linkedinUrl ? <ExternalUrl url={lead.linkedinUrl} className="wrap-anywhere" /> : null
}

// Une fiche en opposition ne se modifie ni ne se supprime : seul l'effacement des échanges lui reste.
function rowActions(lead: AdminLead) {
  if (lead.optedOutAt && lead.exchangesErasedAt) return null
  if (lead.optedOutAt) return <ErasePersonExchangesDialog person={lead} />
  return (
    <>
      <RowActionButton aria-label={`Modifier ${personDisplayName(lead)}`} asChild>
        <Link href={`/admin/leads/${lead.id}`}>
          <Pencil className="size-4" />
        </Link>
      </RowActionButton>
      <DeleteLeadDialog lead={lead} />
    </>
  )
}

function companyCell(lead: AdminLead) {
  if (!lead.company) return null
  return (
    <span className="flex min-w-0 items-center gap-2">
      <CompanyLogoTile logoFilename={lead.company.logoFilename} size="sm" />
      <TruncateTooltip className="min-w-0">{lead.company.name}</TruncateTooltip>
    </span>
  )
}

function buildDataColumns(view: LeadView): readonly Column<AdminLead>[] {
  const visibleByDefault = LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  return [
    {
      key: "name",
      header: PERSON_FIELD_LABELS.name,
      width: LEAD_COLUMN_WIDTHS.name,
      sortValue: (lead) => personDisplayName(lead),
      searchValue: (lead) => `${personDisplayName(lead)} ${lead.company?.name ?? ""}`,
      cell: (lead) => (
        <TruncateTooltip className="block w-full font-medium">
          {personDisplayName(lead)}
        </TruncateTooltip>
      ),
    },
    {
      key: "status",
      header: LEAD_FIELD_LABELS.status,
      width: LEAD_COLUMN_WIDTHS.status,
      ...hideableColumn(visibleByDefault, "status"),
      cell: statusBadge,
    },
    {
      key: "interest",
      header: LEAD_FIELD_LABELS.interest,
      width: LEAD_COLUMN_WIDTHS.interest,
      ...hideableColumn(visibleByDefault, "interest"),
      cell: interestBadge,
    },
    {
      key: "score",
      header: LEAD_FIELD_LABELS.score,
      width: LEAD_COLUMN_WIDTHS.score,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "score"),
      sortValue: (lead) => lead.score ?? -1,
      cell: (lead) => lead.score,
    },
    {
      key: "origin",
      header: LEAD_FIELD_LABELS.origin,
      width: LEAD_COLUMN_WIDTHS.origin,
      ...hideableColumn(visibleByDefault, "origin"),
      cell: originBadge,
    },
    {
      key: "channel",
      header: LEAD_FIELD_LABELS.channel,
      width: LEAD_COLUMN_WIDTHS.channel,
      ...hideableColumn(visibleByDefault, "channel"),
      cell: channelBadge,
    },
    {
      key: "metAt",
      header: PERSON_FIELD_LABELS.metAt,
      width: LEAD_COLUMN_WIDTHS.metAt,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "metAt"),
      sortValue: (lead) => lead.metAt?.getTime() ?? 0,
      cell: (lead) => formatShortDate(lead.metAt),
    },
    {
      key: "jobRole",
      header: PERSON_FIELD_LABELS.jobRole,
      width: LEAD_COLUMN_WIDTHS.jobRole,
      ...hideableColumn(visibleByDefault, "jobRole"),
      cell: (lead) => labelBadge(lead.jobRole ? JOB_ROLE_LABELS[lead.jobRole] : null),
    },
    {
      key: "company",
      header: PERSON_FIELD_LABELS.companyId,
      width: LEAD_COLUMN_WIDTHS.company,
      ...hideableColumn(visibleByDefault, "company"),
      sortValue: (lead) => lead.company?.name ?? "",
      cell: companyCell,
    },
    {
      key: "zone",
      header: PERSON_FIELD_LABELS.zone,
      width: LEAD_COLUMN_WIDTHS.zone,
      ...hideableColumn(visibleByDefault, "zone"),
      cell: (lead) => labelBadge(lead.zone ? ZONE_LABELS[lead.zone] : null),
    },
    {
      key: "linkedinUrl",
      header: PERSON_FIELD_LABELS.linkedinUrl,
      width: LEAD_COLUMN_WIDTHS.linkedinUrl,
      ...hideableColumn(visibleByDefault, "linkedinUrl"),
      cell: (lead) =>
        lead.linkedinUrl ? (
          <TruncateTooltip className="block w-full">
            <ExternalUrl url={lead.linkedinUrl} />
          </TruncateTooltip>
        ) : null,
    },
    {
      key: "email",
      header: PERSON_FIELD_LABELS.email,
      width: LEAD_COLUMN_WIDTHS.email,
      ...hideableColumn(visibleByDefault, "email"),
      cell: (lead) => truncatedCell(lead.email),
    },
    {
      key: "phone",
      header: PERSON_FIELD_LABELS.phone,
      width: LEAD_COLUMN_WIDTHS.phone,
      className: "tabular-nums",
      ...hideableColumn(visibleByDefault, "phone"),
      cell: (lead) => truncatedCell(lead.phone),
    },
    {
      key: "notes",
      header: PERSON_FIELD_LABELS.notes,
      width: LEAD_COLUMN_WIDTHS.notes,
      className: "text-muted-foreground",
      ...hideableColumn(visibleByDefault, "notes"),
      cell: (lead) => truncatedCell(lead.notes),
    },
  ]
}

function buildLeadDetail(lead: AdminLead, onEdit: () => void): DetailContent {
  if (lead.optedOutAt) {
    return {
      title: personDisplayName(lead),
      status: statusBadge(lead, { variant: "outline", meta: true }),
      sections: [
        {
          title: PERSON_SECTION_TITLES.optOut,
          rows: [
            { label: PERSON_FIELD_LABELS.email, value: lead.email, fullWidth: true },
            { label: PERSON_FIELD_LABELS.linkedinUrl, value: linkedinLink(lead), fullWidth: true },
            { label: PERSON_FIELD_LABELS.optedOutAt, value: formatShortDate(lead.optedOutAt) },
            {
              label: PERSON_FIELD_LABELS.exchangesErasedAt,
              value: formatShortDate(lead.exchangesErasedAt),
            },
          ],
        },
      ],
    }
  }

  return {
    title: personDisplayName(lead),
    ...(lead.jobRole ? { subtitle: JOB_ROLE_LABELS[lead.jobRole] } : {}),
    status: statusBadge(lead, { variant: "outline", meta: true }),
    // Le poste est dans le sous-titre et le statut en tête : ni l'un ni l'autre n'a de ligne dans un bloc.
    sections: [
      {
        title: PERSON_SECTION_TITLES.person,
        rows: [
          {
            label: PERSON_FIELD_LABELS.companyId,
            value: lead.company ? (
              <Link
                href={`/admin/entreprises?detail=${lead.company.id}`}
                className={STANDALONE_LINK_CLASS}
              >
                {lead.company.name}
              </Link>
            ) : null,
          },
          {
            label: PERSON_FIELD_LABELS.zone,
            value: labelBadge(lead.zone ? ZONE_LABELS[lead.zone] : null),
          },
        ],
      },
      {
        title: PERSON_SECTION_TITLES.contact,
        rows: [
          { label: PERSON_FIELD_LABELS.email, value: lead.email },
          { label: PERSON_FIELD_LABELS.phone, value: lead.phone },
          { label: PERSON_FIELD_LABELS.linkedinUrl, value: linkedinLink(lead), fullWidth: true },
        ],
      },
      {
        title: PERSON_SECTION_TITLES.details,
        rows: [
          {
            value: lead.details ? (
              <MarkdownContent markdown={lead.details} variant="admin" />
            ) : null,
            fullWidth: true,
          },
        ],
      },
      {
        title: LEAD_SECTION_TITLES.pipeline,
        rows: [
          // Statut est déjà dans l'en-tête : Intérêt passe en pleine largeur plutôt qu'à côté d'une case vide.
          { label: LEAD_FIELD_LABELS.interest, value: interestBadge(lead), fullWidth: true },
          { label: LEAD_FIELD_LABELS.origin, value: originBadge(lead) },
          { label: LEAD_FIELD_LABELS.channel, value: channelBadge(lead) },
          { label: PERSON_FIELD_LABELS.metAt, value: formatShortDate(lead.metAt) },
          {
            label: LEAD_FIELD_LABELS.score,
            value: lead.score === null ? null : `${lead.score} / 10`,
          },
        ],
      },
      { title: PERSON_SECTION_TITLES.notes, rows: [{ value: lead.notes, fullWidth: true }] },
      {
        title: LEAD_SECTION_TITLES.network,
        rows: [
          // TODO: lien vers la vue détail du contact quand le rôle Contact existera (`hasContactRole`) ; la valeur reste absente d'ici là.
          { value: null, fullWidth: true },
        ],
      },
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminLead>[] = [
  {
    key: "status",
    label: LEAD_FIELD_LABELS.status,
    options: LEAD_STATUSES.map((status) => ({ value: status, label: LEAD_STATUS_LABELS[status] })),
    // Une fiche en opposition affiche « Ne plus contacter » à la place du statut : un filtre sur le statut stocké ne doit pas la lister.
    value: (lead) => (lead.optedOutAt ? [] : [lead.status]),
  },
  {
    key: "interest",
    label: LEAD_FIELD_LABELS.interest,
    options: LEAD_INTERESTS.map((interest) => ({
      value: interest,
      label: LEAD_INTEREST_LABELS[interest],
    })),
    value: (lead) => (lead.interest ? [lead.interest] : []),
  },
  {
    key: "origin",
    label: LEAD_FIELD_LABELS.origin,
    options: LEAD_ORIGINS.map((origin) => ({ value: origin, label: LEAD_ORIGIN_LABELS[origin] })),
    value: (lead) => lead.origin,
  },
  {
    key: "jobRole",
    label: PERSON_FIELD_LABELS.jobRole,
    options: JOB_ROLES.map((role) => ({ value: role, label: JOB_ROLE_LABELS[role] })),
    value: (lead) => (lead.jobRole ? [lead.jobRole] : []),
  },
  {
    key: "zone",
    label: PERSON_FIELD_LABELS.zone,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (lead) => (lead.zone ? [lead.zone] : []),
  },
]

interface Props {
  leads: readonly AdminLead[]
  view: LeadView
  initialDetailId?: string
}

export function LeadsTable({ leads, view, initialDetailId }: Props) {
  const router = useRouter()
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(
    () => leads.find((lead) => lead.id === initialDetailId) ?? null,
  )

  const viewLeads = useMemo(() => leadsForView(leads, view), [leads, view])

  const columns = useMemo<readonly Column<AdminLead>[]>(
    () => [...buildDataColumns(view), actionsColumn(rowActions)],
    [view],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedLead
        ? buildLeadDetail(selectedLead, () => {
            router.push(`/admin/leads/${selectedLead.id}`)
          })
        : null,
    [selectedLead, router],
  )

  return (
    <>
      <DataTable
        rows={viewLeads}
        columns={columns}
        getRowId={(lead) => lead.id}
        searchPlaceholder="Rechercher un nom ou une entreprise"
        noun="lead"
        onRowClick={setSelectedLead}
        rowLabel={personDisplayName}
        facets={facets}
        empty={{
          icon: UserPlus,
          title: "Aucun lead",
          description: "Aucun lead dans cette vue. Créez-en un via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null)
        }}
      />
    </>
  )
}
