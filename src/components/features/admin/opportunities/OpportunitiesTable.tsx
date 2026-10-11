"use client"

import { useMemo, useState, type ComponentProps } from "react"
import { Handshake, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  DetailDialog,
  type DetailSection,
} from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { RelatedLinksList } from "@/components/features/admin/RelatedLinksList"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import {
  actionsColumn,
  companyCell,
  contractBadge,
  hideableColumn,
  truncatedCell,
  workModeBadge,
  zoneBadge,
} from "@/components/features/admin/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteOpportunityDialog } from "@/components/features/admin/opportunities/DeleteOpportunityDialog"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import {
  ADMIN_COMPANIES_PATH,
  ADMIN_INTERVIEWS_PATH,
  ADMIN_OPPORTUNITIES_PATH,
} from "@/lib/admin-routes"
import {
  OPPORTUNITY_COLUMN_WIDTHS,
  OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS,
} from "@/lib/admin-table-widths"
import { detailHref } from "@/lib/detail-links"
import { toOpportunityInterviewLinks } from "@/lib/interviews"
import {
  formatDailyRate,
  formatDays,
  formatDuration,
  formatRhythm,
  formatStartMonth,
  OPPORTUNITY_FIELD_LABELS as LABELS,
  OPPORTUNITY_SECTION_TITLES,
  OPPORTUNITY_STATUS_ICONS,
  OPPORTUNITY_STATUS_LABELS,
} from "@/lib/opportunities"
import { opportunitiesForView, type OpportunityView } from "@/lib/opportunity-views"
import { personDetailHref } from "@/lib/person-links"
import { OPTED_OUT_LABEL, personDisplayName } from "@/lib/persons"
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  WORK_MODE_LABELS,
  WORK_MODES,
} from "@/lib/projects"
import { OPPORTUNITY_STATUSES } from "@/lib/schemas/opportunity"
import { STANDALONE_LINK_CLASS } from "@/lib/typography"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminOpportunity } from "@/server/queries/opportunities"

function statusBadge(
  opportunity: AdminOpportunity,
  badgeProps?: Omit<ComponentProps<typeof Badge>, "children">,
) {
  return (
    <EnumBadge
      label={OPPORTUNITY_STATUS_LABELS[opportunity.status]}
      icon={OPPORTUNITY_STATUS_ICONS[opportunity.status]}
      {...badgeProps}
    />
  )
}

function rowActions(opportunity: AdminOpportunity) {
  return (
    <>
      <RowActionButton aria-label={`Modifier ${opportunity.title}`} asChild>
        <Link href={`${ADMIN_OPPORTUNITIES_PATH}/${opportunity.id}`}>
          <Pencil className="size-4" />
        </Link>
      </RowActionButton>
      <DeleteOpportunityDialog opportunity={opportunity} />
    </>
  )
}

function buildDataColumns(view: OpportunityView): readonly Column<AdminOpportunity>[] {
  const visibleByDefault = OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  return [
    {
      key: "title",
      header: LABELS.title,
      width: OPPORTUNITY_COLUMN_WIDTHS.title,
      sortValue: (opportunity) => opportunity.title,
      searchValue: (opportunity) =>
        [
          opportunity.title,
          opportunity.role ?? "",
          opportunity.intermediary?.name ?? "",
          opportunity.client?.name ?? "",
        ].join(" "),
      cell: (opportunity) => (
        <TruncateTooltip className="block w-full font-medium">{opportunity.title}</TruncateTooltip>
      ),
    },
    {
      key: "status",
      header: LABELS.status,
      width: OPPORTUNITY_COLUMN_WIDTHS.status,
      ...hideableColumn(visibleByDefault, "status"),
      cell: (opportunity) => statusBadge(opportunity),
    },
    {
      key: "referrer",
      header: LABELS.referrerId,
      width: OPPORTUNITY_COLUMN_WIDTHS.referrer,
      ...hideableColumn(visibleByDefault, "referrer"),
      sortValue: (opportunity) =>
        opportunity.referrer ? personDisplayName(opportunity.referrer) : "",
      cell: (opportunity) =>
        truncatedCell(opportunity.referrer ? personDisplayName(opportunity.referrer) : null),
    },
    {
      key: "intermediary",
      header: LABELS.intermediaryId,
      width: OPPORTUNITY_COLUMN_WIDTHS.intermediary,
      ...hideableColumn(visibleByDefault, "intermediary"),
      sortValue: (opportunity) => opportunity.intermediary?.name ?? "",
      cell: (opportunity) => companyCell({ company: opportunity.intermediary }),
    },
    {
      key: "client",
      header: LABELS.clientId,
      width: OPPORTUNITY_COLUMN_WIDTHS.client,
      ...hideableColumn(visibleByDefault, "client"),
      sortValue: (opportunity) => opportunity.client?.name ?? "",
      cell: (opportunity) => companyCell({ company: opportunity.client }),
    },
    {
      key: "dailyRate",
      header: LABELS.dailyRate,
      width: OPPORTUNITY_COLUMN_WIDTHS.dailyRate,
      align: "right",
      className: "tabular-nums",
      ...hideableColumn(visibleByDefault, "dailyRate"),
      sortValue: (opportunity) => opportunity.dailyRate ?? -1,
      cell: (opportunity) => formatDailyRate(opportunity.dailyRate),
    },
    {
      key: "contract",
      header: LABELS.contract,
      width: OPPORTUNITY_COLUMN_WIDTHS.contract,
      ...hideableColumn(visibleByDefault, "contract"),
      cell: contractBadge,
    },
    {
      key: "workMode",
      header: LABELS.workMode,
      width: OPPORTUNITY_COLUMN_WIDTHS.workMode,
      ...hideableColumn(visibleByDefault, "workMode"),
      cell: workModeBadge,
    },
    {
      key: "rhythm",
      header: LABELS.daysPerWeek,
      width: OPPORTUNITY_COLUMN_WIDTHS.rhythm,
      className: "text-muted-foreground",
      ...hideableColumn(visibleByDefault, "rhythm"),
      cell: (opportunity) => formatRhythm(opportunity.daysPerWeek, opportunity.onSiteDays),
    },
    {
      key: "zone",
      header: LABELS.zone,
      width: OPPORTUNITY_COLUMN_WIDTHS.zone,
      ...hideableColumn(visibleByDefault, "zone"),
      cell: zoneBadge,
    },
    {
      key: "startMonth",
      header: LABELS.startMonth,
      width: OPPORTUNITY_COLUMN_WIDTHS.startMonth,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "startMonth"),
      sortValue: (opportunity) => opportunity.startMonth?.getTime() ?? 0,
      cell: (opportunity) => formatStartMonth(opportunity.startMonth),
    },
    {
      key: "duration",
      header: LABELS.durationMonths,
      width: OPPORTUNITY_COLUMN_WIDTHS.duration,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "duration"),
      sortValue: (opportunity) => opportunity.durationMonths ?? 0,
      cell: (opportunity) => formatDuration(opportunity.durationMonths),
    },
    {
      key: "notes",
      header: LABELS.notes,
      width: OPPORTUNITY_COLUMN_WIDTHS.notes,
      className: "text-muted-foreground",
      ...hideableColumn(visibleByDefault, "notes"),
      cell: (opportunity) => truncatedCell(opportunity.notes),
    },
  ]
}

function referrerValue(referrer: NonNullable<AdminOpportunity["referrer"]>) {
  // Un apporteur peut avoir perdu son seul rôle : sans fiche à ouvrir, son nom reste en texte simple.
  const href = personDetailHref(referrer)
  const name = personDisplayName(referrer)
  return (
    <span className="flex flex-wrap items-center gap-2">
      {href ? (
        <Link href={href} className={STANDALONE_LINK_CLASS}>
          {name}
        </Link>
      ) : (
        <span>{name}</span>
      )}
      {referrer.optedOutAt ? <Badge variant="outline">{OPTED_OUT_LABEL}</Badge> : null}
    </span>
  )
}

function companyLink(company: AdminOpportunity["client"]) {
  if (!company) return null
  return (
    <Link href={detailHref(ADMIN_COMPANIES_PATH, company.id)} className={STANDALONE_LINK_CLASS}>
      {company.name}
    </Link>
  )
}

function interviewsSection(opportunity: AdminOpportunity): DetailSection {
  return {
    title: OPPORTUNITY_SECTION_TITLES.interviews,
    rows: [
      {
        fullWidth: true,
        value:
          opportunity.interviews.length === 0 ? null : (
            <RelatedLinksList
              links={toOpportunityInterviewLinks(opportunity.interviews, (id) =>
                detailHref(ADMIN_INTERVIEWS_PATH, id),
              )}
            />
          ),
      },
    ],
  }
}

function buildOpportunityDetail(opportunity: AdminOpportunity, onEdit: () => void): DetailContent {
  return {
    title: opportunity.title,
    ...(opportunity.role ? { subtitle: opportunity.role } : {}),
    status: statusBadge(opportunity, { variant: "outline", meta: true }),
    // Intitulé, Rôle et Statut sont dans l'en-tête : le bloc Opportunité du formulaire n'a pas de pendant ici.
    sections: [
      {
        title: OPPORTUNITY_SECTION_TITLES.relations,
        rows: [
          {
            label: LABELS.referrerId,
            value: opportunity.referrer ? referrerValue(opportunity.referrer) : null,
            fullWidth: true,
          },
          { label: LABELS.intermediaryId, value: companyLink(opportunity.intermediary) },
          { label: LABELS.clientId, value: companyLink(opportunity.client) },
        ],
      },
      {
        title: OPPORTUNITY_SECTION_TITLES.details,
        rows: [
          {
            value: opportunity.details ? (
              <MarkdownContent markdown={opportunity.details} variant="admin" />
            ) : null,
            fullWidth: true,
          },
        ],
      },
      {
        title: OPPORTUNITY_SECTION_TITLES.conditions,
        rows: [
          { label: LABELS.dailyRate, value: formatDailyRate(opportunity.dailyRate) },
          { label: LABELS.contract, value: contractBadge(opportunity) },
          { label: LABELS.workMode, value: workModeBadge(opportunity) },
          { label: LABELS.zone, value: zoneBadge(opportunity) },
          { label: LABELS.daysPerWeek, value: formatDays(opportunity.daysPerWeek) },
          { label: LABELS.onSiteDays, value: formatDays(opportunity.onSiteDays) },
        ],
      },
      {
        title: OPPORTUNITY_SECTION_TITLES.calendar,
        rows: [
          { label: LABELS.startMonth, value: formatStartMonth(opportunity.startMonth) },
          { label: LABELS.durationMonths, value: formatDuration(opportunity.durationMonths) },
        ],
      },
      {
        title: OPPORTUNITY_SECTION_TITLES.notes,
        rows: [{ value: opportunity.notes, fullWidth: true }],
      },
      interviewsSection(opportunity),
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminOpportunity>[] = [
  {
    key: "status",
    label: LABELS.status,
    options: OPPORTUNITY_STATUSES.map((status) => ({
      value: status,
      label: OPPORTUNITY_STATUS_LABELS[status],
    })),
    value: (opportunity) => opportunity.status,
  },
  {
    key: "contract",
    label: LABELS.contract,
    options: CONTRACT_STATUSES.map((contract) => ({
      value: contract,
      label: CONTRACT_STATUS_LABELS[contract],
    })),
    value: (opportunity) => (opportunity.contract ? [opportunity.contract] : []),
  },
  {
    key: "workMode",
    label: LABELS.workMode,
    options: WORK_MODES.map((mode) => ({ value: mode, label: WORK_MODE_LABELS[mode] })),
    value: (opportunity) => (opportunity.workMode ? [opportunity.workMode] : []),
  },
  {
    key: "zone",
    label: LABELS.zone,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (opportunity) => (opportunity.zone ? [opportunity.zone] : []),
  },
]

interface Props {
  opportunities: readonly AdminOpportunity[]
  view: OpportunityView
  initialDetailId?: string
}

export function OpportunitiesTable({ opportunities, view, initialDetailId }: Props) {
  const router = useRouter()
  const [selectedOpportunity, setSelectedOpportunity] = useState<AdminOpportunity | null>(
    () => opportunities.find((opportunity) => opportunity.id === initialDetailId) ?? null,
  )

  const viewOpportunities = useMemo(
    () => opportunitiesForView(opportunities, view),
    [opportunities, view],
  )

  const columns = useMemo<readonly Column<AdminOpportunity>[]>(
    () => [...buildDataColumns(view), actionsColumn(rowActions)],
    [view],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedOpportunity
        ? buildOpportunityDetail(selectedOpportunity, () => {
            router.push(`${ADMIN_OPPORTUNITIES_PATH}/${selectedOpportunity.id}`)
          })
        : null,
    [selectedOpportunity, router],
  )

  return (
    <>
      <DataTable
        rows={viewOpportunities}
        columns={columns}
        getRowId={(opportunity) => opportunity.id}
        searchPlaceholder="Rechercher une opportunité, une ESN ou un client"
        noun="opportunité"
        onRowClick={setSelectedOpportunity}
        rowLabel={(opportunity) => opportunity.title}
        facets={facets}
        empty={{
          icon: Handshake,
          title: "Aucune opportunité",
          description: "Aucune opportunité dans cette vue. Créez-en une via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedOpportunity(null)
        }}
      />
    </>
  )
}
