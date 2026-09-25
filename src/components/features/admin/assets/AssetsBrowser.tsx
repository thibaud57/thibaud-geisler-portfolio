"use client"

import { useState } from "react"
import { Copy, Images, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

import { AssetPreview } from "@/components/features/admin/assets/AssetPreview"
import { DeleteAssetDialog } from "@/components/features/admin/assets/DeleteAssetDialog"
import { BadgeList } from "@/components/features/admin/BadgeList"
import { EmptyState } from "@/components/features/admin/EmptyState"
import { FacetFilter } from "@/components/features/admin/FacetFilter"
import { PaginationFooter } from "@/components/features/admin/PaginationFooter"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { SearchInput } from "@/components/features/admin/SearchInput"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useFacetedSearch, type Facet } from "@/hooks/use-faceted-search"
import {
  buildAssetUrl,
  isPdfAssetKey,
  matchesAssetSearch,
  nameOfAssetKey,
  pathOfAssetKey,
} from "@/lib/assets"
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination"
import { ASSET_FOLDERS } from "@/lib/schemas/asset"
import type { AssetEntry } from "@/server/queries/assets"

interface Props {
  assets: readonly AssetEntry[]
  usage: ReadonlyMap<string, readonly string[]>
  initialSearch?: string
}

function folderOf(key: string): string {
  return ASSET_FOLDERS.find((folder) => key.startsWith(`${folder}/`)) ?? pathOfAssetKey(key)
}

function kindOf(key: string): "image" | "pdf" {
  return isPdfAssetKey(key) ? "pdf" : "image"
}

function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

const FACETS: readonly Facet<AssetEntry>[] = [
  {
    key: "folder",
    label: "Dossier",
    options: ASSET_FOLDERS.map((folder) => ({ value: folder, label: `${folder}/` })),
    value: (asset) => folderOf(asset.key),
  },
  {
    key: "nature",
    label: "Nature",
    options: [
      { value: "image", label: "Image" },
      { value: "pdf", label: "PDF" },
    ],
    value: (asset) => kindOf(asset.key),
  },
]

export function AssetsBrowser({ assets, usage, initialSearch = "" }: Props) {
  const [filterOpen, setFilterOpen] = useState(false)
  const {
    search,
    setSearch,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    facetSelections,
    filteredRows: filteredAssets,
    facetGroups,
    toggleFacet,
    resetFacets,
    resetSearchAndFacets,
    paginate,
  } = useFacetedSearch({
    rows: assets,
    matchesSearch: matchesAssetSearch,
    facets: FACETS,
    initialSearch,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  const { currentPage, pageCount, pageItems: paginatedAssets } = paginate(filteredAssets)

  function handleCopyPath(asset: AssetEntry) {
    const path = buildAssetUrl(asset.key)
    navigator.clipboard
      .writeText(path)
      .then(() => {
        toast.success("Chemin copié")
      })
      .catch(() => {
        toast.error("La copie a échoué")
      })
  }

  if (assets.length === 0) {
    return (
      <EmptyState
        icon={Images}
        title="Aucun asset"
        description="Aucun asset pour le moment. Déposez-en un via le bouton ci-dessus."
        className="border border-solid"
      />
    )
  }

  const facetSummary = facetGroups
    .flatMap((group) =>
      group.options
        .filter((option) => facetSelections[group.key]?.has(option.value))
        .map((option) => option.label),
    )
    .join(", ")

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Rechercher un fichier ou un dossier"
        />
        <FacetFilter
          groups={facetGroups}
          selected={facetSelections}
          onToggle={toggleFacet}
          onReset={resetFacets}
          open={filterOpen}
          onOpenChange={setFilterOpen}
        />
      </div>

      {filteredAssets.length === 0 ? (
        <EmptyState
          icon={Images}
          title="Aucun résultat ne correspond à ces filtres"
          description="Essayez une autre recherche ou modifiez les filtres actifs."
          className="border border-solid"
          onReset={resetSearchAndFacets}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {paginatedAssets.map((asset) => (
              <AssetTile
                key={asset.key}
                asset={asset}
                usedBy={usage.get(asset.key) ?? []}
                onCopyPath={() => {
                  handleCopyPath(asset)
                }}
              />
            ))}
          </div>

          <PaginationFooter
            count={filteredAssets.length}
            noun="fichier"
            suffix={facetSummary}
            currentPage={currentPage}
            pageCount={pageCount}
            onPageChange={setPage}
            rowsPerPage={rowsPerPage}
            onRowsPerPageChange={setRowsPerPage}
          />
        </>
      )}
    </div>
  )
}

function AssetTile({
  asset,
  usedBy,
  onCopyPath,
}: {
  asset: AssetEntry
  usedBy: readonly string[]
  onCopyPath: () => void
}) {
  const name = nameOfAssetKey(asset.key)

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <AssetPreview assetKey={asset.key} sizes="200px" />

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{formatSize(asset.size)}</span>
          <span className="inline-flex gap-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <RowActionButton aria-label={`Copier le chemin de ${name}`} onClick={onCopyPath}>
                  <Copy className="size-4" />
                </RowActionButton>
              </TooltipTrigger>
              <TooltipContent>Copier le chemin</TooltipContent>
            </Tooltip>
            <DeleteAssetDialog assetKey={asset.key} usedBy={usedBy} />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-muted-foreground">
          <LinkIcon aria-hidden className="size-3 shrink-0" />
          {/* Rangée réservée sur toutes les tuiles (docs/DESIGN.md § Arbitrages) : vide, elle ne
              montre rien, pas même un tiret. */}
          <BadgeList labels={usedBy} noun="rattachements" empty={null} />
        </div>
      </CardContent>
    </Card>
  )
}
