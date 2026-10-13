"use client"

import { useCallback, useMemo, useState } from "react"
import { Building2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { CompanyLogoTile } from "@/components/features/admin/display/CompanyLogoTile"
import { DataTable, type Column } from "@/components/features/admin/table/DataTable"
import type { Facet } from "@/lib/admin/facets"
import { type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import { EditRowLink } from "@/components/features/admin/table/EditRowLink"
import {
  actionsColumn,
  enumFacet,
  hideableColumn,
} from "@/components/features/admin/table/table-cells"
import { enumBadge } from "@/components/features/admin/display/badges"
import { truncatedCell } from "@/components/features/admin/table/table-cells"
import { TruncateTooltip } from "@/components/features/admin/display/TruncateTooltip"
import { DeleteCompanyDialog } from "@/components/features/admin/companies/DeleteCompanyDialog"
import { BadgeList } from "@/components/features/admin/display/BadgeList"
import { ExternalUrl } from "@/components/features/admin/display/ExternalUrl"
import { TitleCell } from "@/components/features/admin/table/TitleCell"
import { useSignalDetail } from "@/components/features/admin/signals/use-signal-detail"
import {
  COMPANY_COLUMN_WIDTHS,
  COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS,
} from "@/components/features/admin/companies/company-table-widths"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_STATUS_ICONS,
  COMPANY_TYPE_LABELS,
  isEsn,
  RELATION_STATUS_LABELS,
} from "@/lib/crm/companies"
import type { CompanyView } from "@/lib/crm/company-views"
import { ADMIN_COMPANIES_PATH } from "@/lib/admin/routes"
import { formatShortInstantDate } from "@/lib/date-time"
import { COMPANY_TYPES, RELATION_STATUSES } from "@/lib/schemas/company"
import { signalFacet } from "@/lib/crm/signals"
import { ZONE_LABELS, ZONES } from "@/lib/crm/zones"
import { useRowDetail } from "@/components/features/admin/detail/use-row-detail"
import type { AdminCompany } from "@/server/queries/companies"
import {
  TYPE_ICONS_BY_LABEL,
  buildCompanyDetail,
  sectorLabels,
  sizeBadge,
  typeLabels,
  workedLabel,
  zoneLabels,
} from "@/components/features/admin/companies/company-detail"

const VIEW_FILTER: Record<CompanyView, (company: AdminCompany) => boolean> = {
  all: () => true,
  travaillees: (company) => company.worked,
  recrutement: isEsn,
  prospects: (company) => company.isProspect,
}

function buildColumns(view: CompanyView): readonly Column<AdminCompany>[] {
  const visibleByDefault = COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  return [
    {
      key: "name",
      header: COMPANY_FIELD_LABELS.name,
      width: COMPANY_COLUMN_WIDTHS.name,
      sortValue: (company) => company.name,
      searchValue: (company) => `${company.name} ${company.slug}`,
      cell: (company) => (
        <TitleCell
          title={company.name}
          subtitle={company.slug}
          mono
          leading={<CompanyLogoTile logoFilename={company.logoFilename} />}
        />
      ),
    },
    {
      key: "types",
      header: COMPANY_FIELD_LABELS.types,
      width: COMPANY_COLUMN_WIDTHS.types,
      ...hideableColumn(visibleByDefault, "types"),
      cell: (company) => (
        <BadgeList labels={typeLabels(company)} noun="types" icons={TYPE_ICONS_BY_LABEL} />
      ),
    },
    {
      key: "sectors",
      header: COMPANY_FIELD_LABELS.sectors,
      width: COMPANY_COLUMN_WIDTHS.sectors,
      ...hideableColumn(visibleByDefault, "sectors"),
      cell: (company) => <BadgeList labels={sectorLabels(company)} noun="secteurs" />,
    },
    {
      key: "zones",
      header: COMPANY_FIELD_LABELS.zones,
      width: COMPANY_COLUMN_WIDTHS.zones,
      ...hideableColumn(visibleByDefault, "zones"),
      cell: (company) => <BadgeList labels={zoneLabels(company)} noun="localités" />,
    },
    {
      key: "size",
      header: COMPANY_FIELD_LABELS.size,
      width: COMPANY_COLUMN_WIDTHS.size,
      ...hideableColumn(visibleByDefault, "size"),
      cell: sizeBadge,
    },
    {
      key: "relationStatus",
      wrapHeader: true,
      header: COMPANY_FIELD_LABELS.relationStatus,
      width: COMPANY_COLUMN_WIDTHS.relationStatus,
      ...hideableColumn(visibleByDefault, "relationStatus"),
      cell: (company) =>
        enumBadge(company.relationStatus, RELATION_STATUS_LABELS, COMPANY_STATUS_ICONS),
    },
    {
      key: "worked",
      header: COMPANY_FIELD_LABELS.worked,
      width: COMPANY_COLUMN_WIDTHS.worked,
      className: "text-muted-foreground",
      ...hideableColumn(visibleByDefault, "worked"),
      cell: workedLabel,
    },
    {
      key: "firstContactAt",
      wrapHeader: true,
      header: COMPANY_FIELD_LABELS.firstContactAt,
      width: COMPANY_COLUMN_WIDTHS.firstContactAt,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "firstContactAt"),
      sortValue: (company) => company.firstContactAt?.getTime() ?? 0,
      cell: (company) => formatShortInstantDate(company.firstContactAt),
    },
    {
      key: "endClients",
      header: COMPANY_FIELD_LABELS.endClients,
      width: COMPANY_COLUMN_WIDTHS.endClients,
      ...hideableColumn(visibleByDefault, "endClients"),
      cell: (company) => <BadgeList labels={company.endClients} noun="clients" />,
    },
    {
      key: "legalEntity",
      header: COMPANY_FIELD_LABELS.legalEntity,
      width: COMPANY_COLUMN_WIDTHS.legalEntity,
      className: "text-muted-foreground",
      ...hideableColumn(visibleByDefault, "legalEntity"),
      cell: (company) => truncatedCell(company.legalEntity?.name),
    },
    {
      key: "websiteUrl",
      header: COMPANY_FIELD_LABELS.websiteUrl,
      width: COMPANY_COLUMN_WIDTHS.websiteUrl,
      ...hideableColumn(visibleByDefault, "websiteUrl"),
      cell: (company) =>
        company.websiteUrl ? (
          <TruncateTooltip className="block w-full">
            <ExternalUrl url={company.websiteUrl} />
          </TruncateTooltip>
        ) : null,
    },
    {
      key: "notes",
      header: COMPANY_FIELD_LABELS.notes,
      width: COMPANY_COLUMN_WIDTHS.notes,
      className: "text-muted-foreground",
      ...hideableColumn(visibleByDefault, "notes"),
      cell: (company) => truncatedCell(company.notes),
    },
    {
      key: "projects",
      header: COMPANY_FIELD_LABELS.projects,
      width: COMPANY_COLUMN_WIDTHS.projects,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "projects"),
      sortValue: (company) => company.clientProjectCount,
      cell: (company) => company.clientProjectCount,
    },
    actionsColumn<AdminCompany>((company) => (
      <>
        <EditRowLink
          href={`${ADMIN_COMPANIES_PATH}/${company.id}`}
          label={`Modifier ${company.name}`}
        />
        <DeleteCompanyDialog company={company} />
      </>
    )),
  ]
}

const facets: readonly Facet<AdminCompany>[] = [
  enumFacet(
    "relationStatus",
    COMPANY_FIELD_LABELS.relationStatus,
    RELATION_STATUSES,
    RELATION_STATUS_LABELS,
    (company: AdminCompany) => company.relationStatus,
  ),
  enumFacet(
    "types",
    COMPANY_FIELD_LABELS.types,
    COMPANY_TYPES,
    COMPANY_TYPE_LABELS,
    (company: AdminCompany) => company.types,
  ),
  enumFacet(
    "zones",
    COMPANY_FIELD_LABELS.zones,
    ZONES,
    ZONE_LABELS,
    (company: AdminCompany) => company.zones,
  ),
]

interface Props {
  companies: readonly AdminCompany[]
  view: CompanyView
  initialDetailId?: string
}

export function CompaniesTable({ companies, view, initialDetailId }: Props) {
  const router = useRouter()
  const [now] = useState(() => new Date())
  const { openSignal, detailFor, reset, formDialog } = useSignalDetail(now)

  const viewFacets = useMemo(() => [...facets, signalFacet<AdminCompany>(now)], [now])

  const viewCompanies = useMemo(() => companies.filter(VIEW_FILTER[view]), [companies, view])
  const columns = useMemo<readonly Column<AdminCompany>[]>(() => buildColumns(view), [view])

  const buildDetail = useCallback(
    (company: AdminCompany): DetailContent =>
      detailFor({ kind: "company", id: company.id, name: company.name }) ??
      buildCompanyDetail(
        company,
        () => {
          router.push(`${ADMIN_COMPANIES_PATH}/${company.id}`)
        },
        now,
        openSignal,
      ),
    [detailFor, now, router, openSignal],
  )

  const { open, dialog } = useRowDetail({
    rows: companies,
    initialDetailId,
    build: buildDetail,
    onClose: reset,
  })

  return (
    <>
      <DataTable
        rows={viewCompanies}
        columns={columns}
        getRowId={(company) => company.id}
        searchPlaceholder="Rechercher un nom ou un slug"
        noun="entreprise"
        onRowClick={(company) => {
          reset()
          open(company)
        }}
        rowLabel={(company) => company.name}
        empty={{
          icon: Building2,
          title: "Aucune entreprise",
          description: "Aucune entreprise dans cette vue. Créez-en une via le bouton ci-dessus.",
        }}
        facets={viewFacets}
      />
      {dialog}
      {formDialog}
    </>
  )
}
