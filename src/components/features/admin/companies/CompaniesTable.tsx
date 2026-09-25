"use client"

import { useMemo, useState } from "react"
import { Building2, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteCompanyDialog } from "@/components/features/admin/companies/DeleteCompanyDialog"
import { AssetPreviewLink } from "@/components/features/admin/assets/AssetPreviewLink"
import { BadgeList } from "@/components/features/admin/BadgeList"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { NameSlugCell } from "@/components/features/admin/NameSlugCell"
import { Badge } from "@/components/ui/badge"
import { COMPANY_COLUMN_WIDTHS } from "@/lib/admin-table-widths"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SECTOR_LABELS,
  COMPANY_SIZE_LABELS,
} from "@/lib/companies"
import type { AdminCompany } from "@/server/queries/companies"

function TruncatedCell({ value }: { value: string | null | undefined }) {
  if (!value) return null
  return <TruncateTooltip className="block w-full">{value}</TruncateTooltip>
}

const columns: readonly Column<AdminCompany>[] = [
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
    key: "sectors",
    header: COMPANY_FIELD_LABELS.sectors,
    width: COMPANY_COLUMN_WIDTHS.sectors,
    hideable: true,
    cell: (company) => (
      <BadgeList
        labels={company.sectors.map((sector) => COMPANY_SECTOR_LABELS[sector])}
        noun="secteurs"
      />
    ),
  },
  {
    key: "size",
    header: COMPANY_FIELD_LABELS.size,
    width: COMPANY_COLUMN_WIDTHS.size,
    hideable: true,
    cell: (company) =>
      company.size ? <Badge variant="secondary">{COMPANY_SIZE_LABELS[company.size]}</Badge> : null,
  },
  {
    key: "legalEntity",
    header: COMPANY_FIELD_LABELS.legalEntityId,
    width: COMPANY_COLUMN_WIDTHS.legalEntity,
    className: "text-muted-foreground",
    hideable: true,
    cell: (company) => <TruncatedCell value={company.legalEntity?.name} />,
  },
  {
    key: "websiteUrl",
    header: COMPANY_FIELD_LABELS.websiteUrl,
    width: COMPANY_COLUMN_WIDTHS.websiteUrl,
    hideable: true,
    cell: (company) =>
      company.websiteUrl ? (
        <TruncateTooltip className="block w-full">
          <ExternalUrl url={company.websiteUrl} />
        </TruncateTooltip>
      ) : null,
  },
  {
    key: "projects",
    header: "Projets",
    width: COMPANY_COLUMN_WIDTHS.projects,
    align: "right",
    className: "tabular-nums text-muted-foreground",
    hideable: true,
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

function buildCompanyDetail(company: AdminCompany, onEdit: () => void): DetailContent {
  const projectCount = company._count.clientMetas
  return {
    title: company.name,
    slug: company.slug,
    subtitle: `${projectCount} projet${projectCount > 1 ? "s" : ""}`,
    status: (
      <Badge variant="outline" meta>
        {projectCount > 0 ? "Travaillée" : "Non travaillée"}
      </Badge>
    ),
    sections: [
      // Chaque bloc reprend les champs de la card du formulaire, dans son ordre et à sa place,
      // moins le slug, que l'en-tête porte déjà.
      {
        title: COMPANY_SECTION_TITLES.identity,
        rows: [
          { label: COMPANY_FIELD_LABELS.name, value: company.name },
          {
            label: COMPANY_FIELD_LABELS.websiteUrl,
            value: <ExternalUrl url={company.websiteUrl} className="wrap-anywhere" />,
          },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.classification,
        rows: [
          {
            label: COMPANY_FIELD_LABELS.sectors,
            value: (
              <BadgeList
                labels={company.sectors.map((sector) => COMPANY_SECTOR_LABELS[sector])}
                noun="secteurs"
                max={Infinity}
              />
            ),
          },
          {
            label: COMPANY_FIELD_LABELS.size,
            value: company.size ? (
              <Badge variant="secondary">{COMPANY_SIZE_LABELS[company.size]}</Badge>
            ) : null,
          },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.legalEntity,
        rows: [{ value: company.legalEntity?.name }],
      },
      {
        title: COMPANY_SECTION_TITLES.logo,
        rows: [
          {
            value: company.logoFilename ? (
              <AssetPreviewLink assetKey={company.logoFilename} />
            ) : null,
          },
        ],
      },
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminCompany, "yes" | "no">[] = [
  {
    key: "worked",
    label: "Travaillée",
    options: [
      { value: "yes", label: "Oui" },
      { value: "no", label: "Non" },
    ],
    value: (company) => (company._count.clientMetas > 0 ? "yes" : "no"),
  },
]

const WORKED_ONLY_FACET_SELECTIONS: Record<string, readonly string[]> = { worked: ["yes"] }

interface Props {
  companies: readonly AdminCompany[]
  workedOnly?: boolean
}

export function CompaniesTable({ companies, workedOnly = false }: Props) {
  const router = useRouter()
  const [selectedCompany, setSelectedCompany] = useState<AdminCompany | null>(null)

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
        rows={companies}
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
        defaultFacetSelections={workedOnly ? WORKED_ONLY_FACET_SELECTIONS : undefined}
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
