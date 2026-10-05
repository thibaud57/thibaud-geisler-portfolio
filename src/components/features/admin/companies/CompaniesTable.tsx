"use client"

import { useMemo, useState } from "react"
import { Building2, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { CompanyLogoLink } from "@/components/features/admin/CompanyLogoLink"
import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
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
  type CompanyColumnKey,
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
import { COMPANY_TYPES, RELATION_STATUSES } from "@/lib/schemas/company"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminCompany } from "@/server/queries/companies"

export type { CompanyView }

const VIEW_FILTER: Record<CompanyView, (company: AdminCompany) => boolean> = {
  toutes: () => true,
  travaillees: (company) => company.worked,
  recrutement: (company) => company.types.includes("ESN_RECRUTEMENT"),
}

// Fonction et non composant : DataTable ne pose EmptyValue que sur un null reçu, pas sur un élément qui rend null.
function truncatedCell(value: string | null | undefined) {
  if (!value) return null
  return <TruncateTooltip className="block w-full">{value}</TruncateTooltip>
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

function hideable(
  view: CompanyView,
  key: Exclude<CompanyColumnKey, "logo" | "name" | "actions">,
): Pick<Column<AdminCompany>, "hideable" | "defaultVisible"> {
  return {
    hideable: true,
    defaultVisible: COMPANY_VIEW_DEFAULT_VISIBLE_COLUMNS[view].includes(key),
  }
}

function buildColumns(view: CompanyView): readonly Column<AdminCompany>[] {
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
      ...hideable(view, "types"),
      cell: (company) => (
        <BadgeList labels={typeLabels(company)} noun="types" icons={TYPE_ICONS_BY_LABEL} />
      ),
    },
    {
      key: "sectors",
      header: COMPANY_FIELD_LABELS.sectors,
      width: COMPANY_COLUMN_WIDTHS.sectors,
      ...hideable(view, "sectors"),
      cell: (company) => <BadgeList labels={sectorLabels(company)} noun="secteurs" />,
    },
    {
      key: "zones",
      header: COMPANY_FIELD_LABELS.zones,
      width: COMPANY_COLUMN_WIDTHS.zones,
      ...hideable(view, "zones"),
      cell: (company) => <BadgeList labels={zoneLabels(company)} noun="zones" />,
    },
    {
      key: "size",
      header: COMPANY_FIELD_LABELS.size,
      width: COMPANY_COLUMN_WIDTHS.size,
      ...hideable(view, "size"),
      cell: sizeBadge,
    },
    {
      key: "relationStatus",
      header: COMPANY_FIELD_LABELS.relationStatus,
      width: COMPANY_COLUMN_WIDTHS.relationStatus,
      ...hideable(view, "relationStatus"),
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
      ...hideable(view, "worked"),
      cell: workedLabel,
    },
    {
      key: "legalEntity",
      header: COMPANY_FIELD_LABELS.legalEntityId,
      width: COMPANY_COLUMN_WIDTHS.legalEntity,
      className: "text-muted-foreground",
      ...hideable(view, "legalEntity"),
      cell: (company) => truncatedCell(company.legalEntity?.name),
    },
    {
      key: "websiteUrl",
      header: COMPANY_FIELD_LABELS.websiteUrl,
      width: COMPANY_COLUMN_WIDTHS.websiteUrl,
      ...hideable(view, "websiteUrl"),
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
      ...hideable(view, "notes"),
      cell: (company) => truncatedCell(company.notes),
    },
    {
      key: "projects",
      header: "Projets",
      width: COMPANY_COLUMN_WIDTHS.projects,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideable(view, "projects"),
      sortValue: (company) => company._count.clientMetas,
      cell: (company) => company._count.clientMetas,
    },
    {
      key: "actions",
      header: "Actions",
      width: COMPANY_COLUMN_WIDTHS.actions,
      align: "right",
      cell: (company) => (
        <span className="inline-flex gap-0">
          <RowActionButton aria-label={`Modifier ${company.name}`} asChild>
            <Link href={`/admin/entreprises/${company.id}`}>
              <Pencil className="size-4" />
            </Link>
          </RowActionButton>
          <DeleteCompanyDialog company={company} />
        </span>
      ),
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
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.notes,
        rows: [
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing -- une chaîne vide doit aussi devenir EmptyValue, pas un bloc vide.
          { value: company.notes || null, fullWidth: true },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.legalEntity,
        rows: [{ value: company.legalEntity?.name }],
      },
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
}

export function CompaniesTable({ companies, view }: Props) {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(null)

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
