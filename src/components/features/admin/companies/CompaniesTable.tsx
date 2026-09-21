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
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { CompanySector } from "@/generated/prisma/client"
import { COMPANY_COLUMN_WIDTHS } from "@/lib/admin-table-widths"
import { COMPANY_SECTOR_LABELS, COMPANY_SIZE_LABELS } from "@/lib/companies"
import type { AdminCompany } from "@/server/queries/companies"

const MAX_VISIBLE_SECTORS = 3

function capSectors(sectors: readonly CompanySector[]) {
  const labels = sectors.map((sector) => COMPANY_SECTOR_LABELS[sector])
  const shown = labels.slice(0, MAX_VISIBLE_SECTORS)
  const hidden = labels.slice(shown.length)
  return { shown, hidden, all: labels.join(" · ") }
}

function TruncatedCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>
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
    header: "Nom",
    width: COMPANY_COLUMN_WIDTHS.name,
    sortValue: (company) => company.name,
    searchValue: (company) => `${company.name} ${company.slug}`,
    cell: (company) => (
      <div className="flex flex-col">
        <span className="font-medium">{company.name}</span>
        <span className="font-mono text-xs text-muted-foreground">{company.slug}</span>
      </div>
    ),
  },
  {
    key: "sectors",
    header: "Secteur",
    width: COMPANY_COLUMN_WIDTHS.sectors,
    hideable: true,
    cell: (company) => {
      const { shown, hidden, all } = capSectors(company.sectors)
      return (
        <div className="flex flex-wrap gap-1">
          {shown.map((label) => (
            <Badge key={label} variant="secondary">
              {label}
            </Badge>
          ))}
          {hidden.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" asChild>
                  <button
                    type="button"
                    aria-label={`Voir les secteurs supplémentaires : ${hidden.join(" · ")}`}
                  >
                    +{hidden.length}
                  </button>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{all}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      )
    },
  },
  {
    key: "size",
    header: "Taille",
    width: COMPANY_COLUMN_WIDTHS.size,
    hideable: true,
    cell: (company) =>
      company.size ? (
        <Badge variant="secondary">{COMPANY_SIZE_LABELS[company.size]}</Badge>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
  },
  {
    key: "legalEntity",
    header: "Entité légale",
    width: COMPANY_COLUMN_WIDTHS.legalEntity,
    className: "text-muted-foreground",
    hideable: true,
    cell: (company) => <TruncatedCell value={company.legalEntity?.name} />,
  },
  {
    key: "websiteUrl",
    header: "Site web",
    width: COMPANY_COLUMN_WIDTHS.websiteUrl,
    className: "text-muted-foreground",
    hideable: true,
    cell: (company) => <TruncatedCell value={company.websiteUrl} />,
  },
  {
    key: "projects",
    header: "Projets",
    width: COMPANY_COLUMN_WIDTHS.projects,
    align: "right",
    className: "font-mono tabular-nums text-muted-foreground",
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
    rows: [
      { label: "Entité légale", value: company.legalEntity?.name ?? "—" },
      { label: "Site web", value: company.websiteUrl ?? "—" },
      {
        label: "Secteur",
        value: company.sectors.length
          ? company.sectors.map((sector) => COMPANY_SECTOR_LABELS[sector]).join(", ")
          : "—",
      },
      { label: "Taille", value: company.size ? COMPANY_SIZE_LABELS[company.size] : "—" },
      { label: "Travaillée", value: projectCount > 0 ? "Oui" : "Non" },
      { label: "Projets", value: `${projectCount} projet${projectCount > 1 ? "s" : ""}` },
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
        countLabel={(count) => (count === 1 ? "1 entreprise" : `${count} entreprises`)}
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
