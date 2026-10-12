"use client"

import { useCallback, useMemo, useState } from "react"
import { Building2 } from "lucide-react"
import { useRouter } from "next/navigation"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/table/DataTable"
import {
  headerBadge,
  type DetailContent,
  type DetailSection,
} from "@/components/features/admin/detail/DetailDialog"
import {
  linksSection,
  markdownSection,
  textSection,
} from "@/components/features/admin/detail/detail-sections"
import { EditRowLink } from "@/components/features/admin/table/EditRowLink"
import {
  actionsColumn,
  enumBadge,
  enumFacet,
  hideableColumn,
  iconsByLabel,
  labelBadge,
  truncatedCell,
} from "@/components/features/admin/table/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteCompanyDialog } from "@/components/features/admin/companies/DeleteCompanyDialog"
import { BadgeList } from "@/components/features/admin/BadgeList"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { NameSlugCell } from "@/components/features/admin/table/NameSlugCell"
import { signalsSection } from "@/components/features/admin/signals/signal-detail"
import { useSignalDetail } from "@/components/features/admin/signals/useSignalDetail"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  COMPANY_COLUMN_WIDTHS,
  COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS,
} from "@/lib/admin/table-widths"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SECTOR_LABELS,
  COMPANY_SIZE_HEADCOUNTS,
  COMPANY_SIZE_LABELS,
  COMPANY_STATUS_ICONS,
  COMPANY_TYPE_ICONS,
  COMPANY_TYPE_LABELS,
  companyOpportunities,
  isEsn,
  RELATION_STATUS_LABELS,
} from "@/lib/crm/companies"
import type { CompanyView } from "@/lib/crm/company-views"
import {
  countryName,
  LEGAL_ENTITY_FIELD_LABELS,
  LEGAL_FORM_LABELS,
  registrationLabel,
  VAT_REGIME_LABELS,
} from "@/lib/crm/legal-entities"
import {
  ADMIN_COMPANIES_PATH,
  ADMIN_LEADS_PATH,
  ADMIN_OPPORTUNITIES_PATH,
} from "@/lib/admin/routes"
import { LEAD_DISPLAY_STATUS_LABELS } from "@/lib/crm/lead-display-status"
import { toLeadLink } from "@/lib/crm/leads"
import { formatSiret } from "@/lib/legal/format-siret"
import { toOpportunityLink } from "@/lib/crm/opportunities"
import { formatDateOnly, formatShortInstantDate } from "@/lib/date-time"
import { detailHref } from "@/lib/admin/detail-links"
import { COMPANY_TYPES, RELATION_STATUSES } from "@/lib/schemas/company"
import { signalFacet, type SignalItem } from "@/lib/crm/signals"
import { ZONE_LABELS, ZONES } from "@/lib/crm/zones"
import { useRowDetail } from "@/hooks/use-row-detail"
import type { AdminCompany } from "@/server/queries/companies"

const VIEW_FILTER: Record<CompanyView, (company: AdminCompany) => boolean> = {
  all: () => true,
  travaillees: (company) => company.worked,
  recrutement: isEsn,
  prospects: (company) => company.isProspect,
}

function typeLabels(company: AdminCompany): string[] {
  return company.types.map((type) => COMPANY_TYPE_LABELS[type])
}

function sectorLabels(company: AdminCompany): string[] {
  return company.sectors.map((sector) => COMPANY_SECTOR_LABELS[sector])
}

function zoneLabels(company: AdminCompany): string[] {
  return company.zones.map((zone) => ZONE_LABELS[zone])
}

const TYPE_ICONS_BY_LABEL = iconsByLabel(COMPANY_TYPES, COMPANY_TYPE_LABELS, COMPANY_TYPE_ICONS)

function workedLabel(company: AdminCompany): string {
  return company.worked ? "Oui" : "Non"
}

function sizeBadge(company: AdminCompany) {
  if (!company.size) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" tabIndex={0}>
          {COMPANY_SIZE_LABELS[company.size]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{COMPANY_SIZE_HEADCOUNTS[company.size]}</TooltipContent>
    </Tooltip>
  )
}

function buildColumns(view: CompanyView): readonly Column<AdminCompany>[] {
  const visibleByDefault = COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  return [
    {
      key: "logo",
      header: "Logo",
      headerSrOnly: true,
      width: COMPANY_COLUMN_WIDTHS.logo,
      cell: (company) => <CompanyLogoTile logoFilename={company.logoFilename} />,
    },
    {
      key: "name",
      header: COMPANY_FIELD_LABELS.name,
      width: COMPANY_COLUMN_WIDTHS.name,
      sortValue: (company) => company.name,
      searchValue: (company) => `${company.name} ${company.slug}`,
      cell: (company) => <NameSlugCell name={company.name} slug={company.slug} />,
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

const CAPITAL_FORMATTER = new Intl.NumberFormat("fr")

function legalEntitySection(company: AdminCompany): DetailSection {
  const entity = company.legalEntity
  const publisher = entity?.publisher

  return {
    title: COMPANY_SECTION_TITLES.legalEntity,
    rows: [
      { label: LEGAL_ENTITY_FIELD_LABELS.name, value: entity?.name },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.legalForm,
        value: labelBadge(entity?.legalForm ? LEGAL_FORM_LABELS[entity.legalForm] : null),
      },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.siret,
        value: entity?.siret ? formatSiret(entity.siret) : null,
      },
      { label: LEGAL_ENTITY_FIELD_LABELS.vatNumber, value: entity?.vatNumber },
      { label: LEGAL_ENTITY_FIELD_LABELS.street, value: entity?.address?.street },
      { label: LEGAL_ENTITY_FIELD_LABELS.postalCode, value: entity?.address?.postalCode },
      { label: LEGAL_ENTITY_FIELD_LABELS.city, value: entity?.address?.city },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.country,
        value: entity?.address ? countryName(entity.address.country) : null,
      },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.registration,
        value: entity ? registrationLabel(entity) : null,
      },
      { label: LEGAL_ENTITY_FIELD_LABELS.phone, value: entity?.phone },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.capitalAmount,
        value:
          entity && entity.capitalAmount !== null
            ? CAPITAL_FORMATTER.format(entity.capitalAmount)
            : null,
      },
      { label: LEGAL_ENTITY_FIELD_LABELS.capitalCurrency, value: entity?.capitalCurrency },
      ...(publisher
        ? [
            {
              label: LEGAL_ENTITY_FIELD_LABELS.vatLiableSince,
              value: publisher.vatLiableSince ? formatDateOnly(publisher.vatLiableSince) : null,
            },
            {
              label: LEGAL_ENTITY_FIELD_LABELS.vatRegime,
              value: labelBadge(
                publisher.vatRegime ? VAT_REGIME_LABELS[publisher.vatRegime] : null,
              ),
            },
          ]
        : []),
    ],
  }
}

function buildCompanyDetail(
  company: AdminCompany,
  onEdit: () => void,
  now: Date,
  onOpenSignal: (signal: SignalItem) => void,
): DetailContent {
  return {
    image: { assetKey: company.logoFilename },
    title: company.name,
    subtitle: company.slug,
    badges: [headerBadge(company.relationStatus, RELATION_STATUS_LABELS, COMPANY_STATUS_ICONS)],
    sections: [
      {
        title: COMPANY_SECTION_TITLES.identity,
        rows: [
          {
            label: COMPANY_FIELD_LABELS.websiteUrl,
            value: company.websiteUrl ? (
              <ExternalUrl url={company.websiteUrl} className="wrap-anywhere" />
            ) : null,
          },
          {
            label: COMPANY_FIELD_LABELS.zones,
            value: <BadgeList labels={zoneLabels(company)} noun="localités" max={Infinity} />,
          },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.classification,
        rows: [
          {
            label: COMPANY_FIELD_LABELS.types,
            value: (
              <BadgeList
                labels={typeLabels(company)}
                noun="types"
                max={Infinity}
                icons={TYPE_ICONS_BY_LABEL}
              />
            ),
          },
          {
            label: COMPANY_FIELD_LABELS.sectors,
            value: <BadgeList labels={sectorLabels(company)} noun="secteurs" max={Infinity} />,
          },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.relation,
        rows: [
          { label: COMPANY_FIELD_LABELS.size, value: sizeBadge(company) },
          { label: COMPANY_FIELD_LABELS.worked, value: workedLabel(company) },
          {
            label: COMPANY_FIELD_LABELS.firstContactAt,
            value: formatShortInstantDate(company.firstContactAt),
          },
          {
            label: COMPANY_FIELD_LABELS.endClients,
            value:
              company.endClients.length > 0 ? (
                <BadgeList labels={company.endClients} noun="clients" max={Infinity} />
              ) : null,
          },
        ],
      },
      legalEntitySection(company),
      textSection(COMPANY_SECTION_TITLES.notes, company.notes),
      markdownSection(COMPANY_SECTION_TITLES.details, company.details),
      linksSection(
        COMPANY_SECTION_TITLES.leads,
        company.leads.map((lead) =>
          toLeadLink(lead, {
            href: detailHref(ADMIN_LEADS_PATH, lead.id),
            statusLabel: LEAD_DISPLAY_STATUS_LABELS[lead.status],
          }),
        ),
      ),
      linksSection(
        COMPANY_SECTION_TITLES.opportunities,
        companyOpportunities(company).map(({ opportunity, role }) =>
          toOpportunityLink(opportunity, {
            href: detailHref(ADMIN_OPPORTUNITIES_PATH, opportunity.id),
            metaSuffix: role,
            idPrefix: role,
          }),
        ),
      ),
      ...signalsSection(company.signals, now, onOpenSignal),
    ],
    onEdit,
  }
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
