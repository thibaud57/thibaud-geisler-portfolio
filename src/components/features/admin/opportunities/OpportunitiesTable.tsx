"use client"

import { useCallback, useMemo } from "react"
import { Handshake } from "lucide-react"
import { useRouter } from "next/navigation"
import { DataTable, type Column } from "@/components/features/admin/table/DataTable"
import type { Facet } from "@/lib/admin/facets"
import { EditRowLink } from "@/components/features/admin/table/EditRowLink"
import {
  actionsColumn,
  enumFacet,
  hideableColumn,
} from "@/components/features/admin/table/table-cells"
import {
  contractBadge,
  enumBadge,
  workModeBadge,
  zoneBadge,
} from "@/components/features/admin/display/badges"
import { companyCell } from "@/components/features/admin/display/record-links"
import { truncatedCell } from "@/components/features/admin/table/table-cells"
import { TitleCell } from "@/components/features/admin/table/TitleCell"
import { DeleteOpportunityDialog } from "@/components/features/admin/opportunities/DeleteOpportunityDialog"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import {
  OPPORTUNITY_COLUMN_WIDTHS,
  OPPORTUNITY_VIEW_DEFAULT_VISIBLE_COLUMNS,
} from "@/components/features/admin/opportunities/opportunity-table-widths"
import {
  formatDailyRate,
  formatDuration,
  formatRhythm,
  formatStartMonth,
  OPPORTUNITY_FIELD_LABELS as LABELS,
  OPPORTUNITY_STATUS_ICONS,
  OPPORTUNITY_STATUS_LABELS,
} from "@/lib/crm/opportunities"
import {
  opportunitiesForView,
  OPPORTUNITY_VIEW_LOCKED_FACETS,
  type OpportunityView,
} from "@/lib/crm/opportunity-views"
import { personDisplayName } from "@/lib/crm/persons"
import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  WORK_MODE_LABELS,
  WORK_MODES,
} from "@/lib/contract-terms"
import { OPPORTUNITY_STATUSES } from "@/lib/schemas/opportunity"
import { ZONE_LABELS, ZONES } from "@/lib/crm/zones"
import { useRowDetail } from "@/components/features/admin/detail/use-row-detail"
import type { AdminOpportunity } from "@/server/queries/opportunities"
import { buildOpportunityDetail } from "@/components/features/admin/opportunities/opportunity-detail"

function rowActions(opportunity: AdminOpportunity) {
  return (
    <>
      <EditRowLink
        href={`${ADMIN_OPPORTUNITIES_PATH}/${opportunity.id}`}
        label={`Modifier ${opportunity.title}`}
      />
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
      cell: (opportunity) => <TitleCell title={opportunity.title} />,
    },
    {
      key: "status",
      header: LABELS.status,
      width: OPPORTUNITY_COLUMN_WIDTHS.status,
      ...hideableColumn(visibleByDefault, "status"),
      cell: (opportunity) =>
        enumBadge(opportunity.status, OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUS_ICONS),
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
      wrapHeader: true,
      header: LABELS.workMode,
      width: OPPORTUNITY_COLUMN_WIDTHS.workMode,
      ...hideableColumn(visibleByDefault, "workMode"),
      cell: workModeBadge,
    },
    {
      key: "rhythm",
      header: LABELS.rhythm,
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
      wrapHeader: true,
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

const facets: readonly Facet<AdminOpportunity>[] = [
  enumFacet(
    "status",
    LABELS.status,
    OPPORTUNITY_STATUSES,
    OPPORTUNITY_STATUS_LABELS,
    (opportunity) => opportunity.status,
  ),
  enumFacet(
    "contract",
    LABELS.contract,
    CONTRACT_STATUSES,
    CONTRACT_STATUS_LABELS,
    (opportunity) => opportunity.contract,
  ),
  enumFacet(
    "workMode",
    LABELS.workMode,
    WORK_MODES,
    WORK_MODE_LABELS,
    (opportunity) => opportunity.workMode,
  ),
  enumFacet("zone", LABELS.zone, ZONES, ZONE_LABELS, (opportunity) => opportunity.zone),
]

interface Props {
  opportunities: readonly AdminOpportunity[]
  view: OpportunityView
  initialDetailId?: string
}

export function OpportunitiesTable({ opportunities, view, initialDetailId }: Props) {
  const router = useRouter()

  const build = useCallback(
    (opportunity: AdminOpportunity) =>
      buildOpportunityDetail(opportunity, () => {
        router.push(`${ADMIN_OPPORTUNITIES_PATH}/${opportunity.id}`)
      }),
    [router],
  )
  const { open, dialog } = useRowDetail({ rows: opportunities, initialDetailId, build })

  const viewOpportunities = useMemo(
    () => opportunitiesForView(opportunities, view),
    [opportunities, view],
  )

  const columns = useMemo<readonly Column<AdminOpportunity>[]>(
    () => [...buildDataColumns(view), actionsColumn(rowActions)],
    [view],
  )

  return (
    <>
      <DataTable
        rows={viewOpportunities}
        columns={columns}
        getRowId={(opportunity) => opportunity.id}
        searchPlaceholder="Rechercher une opportunité, une ESN ou un client"
        noun="opportunité"
        onRowClick={open}
        rowLabel={(opportunity) => opportunity.title}
        facets={facets}
        lockedFacets={OPPORTUNITY_VIEW_LOCKED_FACETS[view]}
        empty={{
          icon: Handshake,
          title: "Aucune opportunité",
          description: "Aucune opportunité dans cette vue. Créez-en une via le bouton ci-dessus.",
        }}
      />
      {dialog}
    </>
  )
}
