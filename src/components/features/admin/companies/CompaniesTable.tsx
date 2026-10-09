"use client"

import { useMemo, useState } from "react"
import { Building2, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { CompanyLogoLink } from "@/components/features/admin/CompanyLogoLink"
import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  DetailDialog,
  type DetailSection,
} from "@/components/features/admin/DetailDialog"
import { RelatedLinksList, type RelatedLink } from "@/components/features/admin/RelatedLinksList"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import {
  actionsColumn,
  hideableColumn,
  truncatedCell,
} from "@/components/features/admin/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteCompanyDialog } from "@/components/features/admin/companies/DeleteCompanyDialog"
import { BadgeList } from "@/components/features/admin/BadgeList"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { NameSlugCell } from "@/components/features/admin/NameSlugCell"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  COMPANY_COLUMN_WIDTHS,
  COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS,
  type CompanyView,
} from "@/lib/admin-table-widths"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SECTOR_LABELS,
  COMPANY_SIZE_HEADCOUNTS,
  COMPANY_SIZE_LABELS,
  COMPANY_STATUS_ICONS,
  COMPANY_TYPE_ICONS,
  COMPANY_TYPE_LABELS,
  RELATION_STATUS_LABELS,
} from "@/lib/companies"
import {
  countryName,
  isFrenchCountry,
  LEGAL_ENTITY_FIELD_LABELS,
  LEGAL_FORM_LABELS,
  sirenFromSiret,
} from "@/lib/legal-entities"
import { ADMIN_LEADS_PATH } from "@/lib/admin-routes"
import { JOB_ROLE_LABELS } from "@/lib/job-roles"
import { LEAD_STATUS_LABELS } from "@/lib/leads"
import { formatSiret } from "@/lib/legal/format-siret"
import { personDisplayName } from "@/lib/persons"
import { formatShortInstantDate } from "@/lib/date-time"
import { detailHref } from "@/lib/detail-links"
import { COMPANY_TYPES, RELATION_STATUSES } from "@/lib/schemas/company"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminCompany } from "@/server/queries/companies"

export type { CompanyView }

const VIEW_FILTER: Record<CompanyView, (company: AdminCompany) => boolean> = {
  toutes: () => true,
  travaillees: (company) => company.worked,
  recrutement: (company) => company.types.includes("ESN_RECRUTEMENT"),
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

// Glyphe par libellé plutôt que par valeur : BadgeList ne connaît que les libellés déjà résolus.
const TYPE_ICONS_BY_LABEL = Object.fromEntries(
  COMPANY_TYPES.map((type) => [COMPANY_TYPE_LABELS[type], COMPANY_TYPE_ICONS[type]]),
)

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
      cell: (company) => <BadgeList labels={zoneLabels(company)} noun="zones" />,
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
      header: COMPANY_FIELD_LABELS.relationStatus,
      width: COMPANY_COLUMN_WIDTHS.relationStatus,
      ...hideableColumn(visibleByDefault, "relationStatus"),
      cell: (company) => (
        <EnumBadge
          label={RELATION_STATUS_LABELS[company.relationStatus]}
          icon={COMPANY_STATUS_ICONS[company.relationStatus]}
        />
      ),
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
      header: COMPANY_FIELD_LABELS.firstContactAt,
      width: COMPANY_COLUMN_WIDTHS.firstContactAt,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "firstContactAt"),
      sortValue: (company) => company.firstContactAt?.getTime() ?? 0,
      cell: (company) => formatShortInstantDate(company.firstContactAt),
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
      header: "Projets",
      width: COMPANY_COLUMN_WIDTHS.projects,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "projects"),
      sortValue: (company) => company._count.clientMetas,
      cell: (company) => company._count.clientMetas,
    },
    actionsColumn<AdminCompany>((company) => (
      <>
        <RowActionButton aria-label={`Modifier ${company.name}`} asChild>
          <Link href={`/admin/entreprises/${company.id}`}>
            <Pencil className="size-4" />
          </Link>
        </RowActionButton>
        <DeleteCompanyDialog company={company} />
      </>
    )),
  ]
}

const CAPITAL_FORMATTER = new Intl.NumberFormat("fr")

function registrationLabel(entity: NonNullable<AdminCompany["legalEntity"]>): string | null {
  if (isFrenchCountry(entity.address?.country)) {
    const siren = sirenFromSiret(entity.siret)
    return entity.rcsCity && siren ? `RCS ${entity.rcsCity} ${siren}` : null
  }
  return [entity.rcsCity, entity.rcsNumber].filter(Boolean).join(" ") || null
}

function legalEntitySections(company: AdminCompany): DetailSection[] {
  const entity = company.legalEntity

  return [
    {
      title: COMPANY_SECTION_TITLES.legalEntity,
      rows: [
        { label: LEGAL_ENTITY_FIELD_LABELS.name, value: entity?.name },
        {
          label: LEGAL_ENTITY_FIELD_LABELS.legalForm,
          value: entity?.legalForm ? (
            <Badge variant="secondary">{LEGAL_FORM_LABELS[entity.legalForm]}</Badge>
          ) : null,
        },
        {
          label: LEGAL_ENTITY_FIELD_LABELS.siret,
          value: entity?.siret ? formatSiret(entity.siret) : null,
        },
        { label: LEGAL_ENTITY_FIELD_LABELS.vatNumber, value: entity?.vatNumber },
        {
          label: LEGAL_ENTITY_FIELD_LABELS.registeredOffice,
          fullWidth: true,
          value: entity?.address ? (
            <span className="whitespace-pre-line">
              {[
                entity.address.street,
                `${entity.address.postalCode} ${entity.address.city}`,
                countryName(entity.address.country),
              ].join("\n")}
            </span>
          ) : null,
        },
        {
          label: LEGAL_ENTITY_FIELD_LABELS.registration,
          value: entity ? registrationLabel(entity) : null,
        },
        { label: LEGAL_ENTITY_FIELD_LABELS.phone, value: entity?.phone },
        {
          // Seul sans paire après le siège : pleine largeur plutôt qu'une case vide à côté.
          label: LEGAL_ENTITY_FIELD_LABELS.capitalAmount,
          fullWidth: true,
          value:
            entity && entity.capitalAmount !== null
              ? `${CAPITAL_FORMATTER.format(entity.capitalAmount)} ${entity.capitalCurrency ?? ""}`.trim()
              : null,
        },
      ],
    },
  ]
}

function leadsSection(company: AdminCompany): DetailSection[] {
  return [
    {
      title: COMPANY_SECTION_TITLES.leads,
      rows: [
        {
          fullWidth: true,
          value:
            company.leads.length === 0 ? null : (
              <RelatedLinksList
                links={company.leads.map((lead): RelatedLink => ({
                  id: lead.id,
                  href: detailHref(ADMIN_LEADS_PATH, lead.id),
                  label: personDisplayName(lead),
                  // Poste puis statut : la ligne dit où en est le lead sans l'ouvrir.
                  meta: [
                    lead.jobRole ? JOB_ROLE_LABELS[lead.jobRole] : null,
                    LEAD_STATUS_LABELS[lead.status],
                  ]
                    .filter(Boolean)
                    .join(" · "),
                }))}
              />
            ),
        },
      ],
    },
  ]
}

function buildCompanyDetail(company: AdminCompany, onEdit: () => void): DetailContent {
  const projectCount = company._count.clientMetas

  return {
    leading: <CompanyLogoLink logoFilename={company.logoFilename} companyName={company.name} />,
    title: company.name,
    slug: company.slug,
    subtitle: `${projectCount} projet${projectCount > 1 ? "s" : ""}`,
    status: (
      <EnumBadge
        variant="outline"
        meta
        label={RELATION_STATUS_LABELS[company.relationStatus]}
        icon={COMPANY_STATUS_ICONS[company.relationStatus]}
      />
    ),
    sections: [
      {
        title: COMPANY_SECTION_TITLES.identity,
        rows: [
          {
            label: COMPANY_FIELD_LABELS.websiteUrl,
            value: company.websiteUrl ? (
              <ExternalUrl url={company.websiteUrl} className="wrap-anywhere" />
            ) : null,
            fullWidth: true,
          },
          {
            label: COMPANY_FIELD_LABELS.zones,
            value: <BadgeList labels={zoneLabels(company)} noun="zones" max={Infinity} />,
            fullWidth: true,
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
            fullWidth: true,
          },
          {
            label: COMPANY_FIELD_LABELS.sectors,
            value: <BadgeList labels={sectorLabels(company)} noun="secteurs" max={Infinity} />,
            fullWidth: true,
          },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.details,
        rows: [
          {
            value: company.details ? (
              <MarkdownContent markdown={company.details} variant="admin" />
            ) : null,
            fullWidth: true,
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
            fullWidth: true,
          },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.notes,
        rows: [
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- une chaîne vide doit aussi devenir EmptyValue, pas un bloc vide.
          { value: company.notes || null, fullWidth: true },
        ],
      },
      ...legalEntitySections(company),
      ...leadsSection(company),
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminCompany>[] = [
  {
    key: "relationStatus",
    label: COMPANY_FIELD_LABELS.relationStatus,
    options: RELATION_STATUSES.map((status) => ({
      value: status,
      label: RELATION_STATUS_LABELS[status],
    })),
    value: (company) => company.relationStatus,
  },
  {
    key: "types",
    label: COMPANY_FIELD_LABELS.types,
    options: COMPANY_TYPES.map((type) => ({ value: type, label: COMPANY_TYPE_LABELS[type] })),
    value: (company) => company.types,
  },
  {
    key: "zones",
    label: COMPANY_FIELD_LABELS.zones,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (company) => company.zones,
  },
]

interface Props {
  companies: readonly AdminCompany[]
  view: CompanyView
  initialDetailId?: string
}

export function CompaniesTable({ companies, view, initialDetailId }: Props) {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(
    () => companies.find((company) => company.id === initialDetailId) ?? null,
  )

  const viewCompanies = useMemo(() => companies.filter(VIEW_FILTER[view]), [companies, view])
  const columns = useMemo<readonly Column<AdminCompany>[]>(() => buildColumns(view), [view])

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedCompany
        ? buildCompanyDetail(selectedCompany, () => {
            router.push(`/admin/entreprises/${selectedCompany.id}`)
          })
        : null,
    [selectedCompany, router],
  )

  return (
    <>
      <DataTable
        rows={viewCompanies}
        columns={columns}
        getRowId={(company) => company.id}
        searchPlaceholder="Rechercher un nom ou un slug"
        noun="entreprise"
        onRowClick={setSelectedCompany}
        rowLabel={(company) => company.name}
        empty={{
          icon: Building2,
          title: "Aucune entreprise",
          description: "Aucune entreprise pour le moment. Créez-en une via le bouton ci-dessus.",
        }}
        facets={facets}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedCompany(null)
        }}
      />
    </>
  )
}
