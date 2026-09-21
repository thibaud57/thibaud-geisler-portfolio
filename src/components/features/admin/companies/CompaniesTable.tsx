"use client"

import { Pencil } from "lucide-react"
import Link from "next/link"

import { AssetImage } from "@/components/features/admin/assets/AssetImage"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import { DeleteCompanyDialog } from "@/components/features/admin/companies/DeleteCompanyDialog"
import { useImageFallback } from "@/components/features/projects/useImageFallback"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { CompanySector } from "@/generated/prisma/client"
import { COMPANY_SECTOR_LABELS, COMPANY_SIZE_LABELS } from "@/lib/companies"
import type { AdminCompany } from "@/server/queries/companies"

const MAX_VISIBLE_SECTORS = 3

function capSectors(sectors: readonly CompanySector[]) {
  const labels = sectors.map((sector) => COMPANY_SECTOR_LABELS[sector])
  const shown = labels.slice(0, MAX_VISIBLE_SECTORS)
  const hidden = labels.slice(shown.length)
  return { shown, hidden, all: labels.join(" · ") }
}

// Bouton réel (pas un span) : Radix documente qu'un TooltipTrigger non focusable
// n'ouvre jamais le tooltip au clavier (WCAG 2.2 SC 1.4.13).
const TRUNCATED_CELL_CLASS =
  "block w-full truncate rounded-sm border border-transparent text-left focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none"

function CompanyLogoTile({ logoFilename }: { logoFilename: string | null }) {
  const { showImage, onError } = useImageFallback(logoFilename)
  return (
    <span className="relative block size-7 overflow-hidden rounded-md border border-border bg-linear-to-br from-primary/20 to-accent/20">
      {showImage && logoFilename ? (
        <AssetImage
          assetKey={logoFilename}
          alt=""
          fill
          sizes="28px"
          className="object-cover"
          onError={onError}
        />
      ) : null}
    </span>
  )
}

function TruncatedCell({ value }: { value: string | null | undefined }) {
  if (!value) return <span className="text-muted-foreground">—</span>
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={TRUNCATED_CELL_CLASS}>
          {value}
        </button>
      </TooltipTrigger>
      <TooltipContent>{value}</TooltipContent>
    </Tooltip>
  )
}

const columns: readonly Column<AdminCompany>[] = [
  {
    key: "logo",
    header: "Logo",
    headerSrOnly: true,
    width: "w-[44px]",
    cell: (company) => <CompanyLogoTile logoFilename={company.logoFilename} />,
  },
  {
    key: "name",
    header: "Nom",
    width: "w-[26%]",
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
    width: "w-[22%]",
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
    width: "w-[96px]",
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
    width: "w-[160px]",
    className: "truncate text-muted-foreground",
    hideable: true,
    cell: (company) => <TruncatedCell value={company.legalEntity?.name} />,
  },
  {
    key: "websiteUrl",
    header: "Site web",
    width: "w-[150px]",
    className: "truncate text-muted-foreground",
    hideable: true,
    cell: (company) => <TruncatedCell value={company.websiteUrl} />,
  },
  {
    key: "projects",
    header: "Projets",
    width: "w-[96px]",
    align: "right",
    className: "font-mono tabular-nums text-muted-foreground",
    hideable: true,
    sortValue: (company) => company._count.clientMetas,
    cell: (company) => company._count.clientMetas,
  },
  {
    key: "actions",
    header: "Actions",
    width: "w-[88px]",
    align: "right",
    cell: (company) => (
      <span className="inline-flex gap-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              // Les deux actions d'une ligne se lisent comme une paire, pas comme deux boutons
              // séparés : d'où une largeur plus étroite que la hauteur.
              className="w-5 min-w-5"
              aria-label={`Modifier ${company.name}`}
              asChild
            >
              <Link href={`/admin/entreprises/${company.id}`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Modifier</TooltipContent>
        </Tooltip>
        <DeleteCompanyDialog company={company} />
      </span>
    ),
  },
]

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
  return (
    <DataTable
      rows={companies}
      columns={columns}
      getRowId={(company) => company.id}
      searchPlaceholder="Rechercher un nom ou un slug"
      countLabel={(count) => (count === 1 ? "1 entreprise" : `${count} entreprises`)}
      empty="Aucune entreprise pour le moment. Créez-en une via le bouton ci-dessus."
      facets={facets}
      defaultFacetSelections={workedOnly ? WORKED_ONLY_FACET_SELECTIONS : undefined}
    />
  )
}
