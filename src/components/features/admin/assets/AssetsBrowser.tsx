"use client"

import { useState } from "react"
import { Copy, Link as LinkIcon } from "lucide-react"
import { toast } from "sonner"

import { AssetPreview } from "@/components/features/admin/assets/AssetPreview"
import { DeleteAssetDialog } from "@/components/features/admin/assets/DeleteAssetDialog"
import { FacetFilter, type FacetFilterGroup } from "@/components/features/admin/FacetFilter"
import { PaginationFooter } from "@/components/features/admin/PaginationFooter"
import { SearchInput } from "@/components/features/admin/SearchInput"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  assetKeyMatchesQuery,
  buildAssetUrl,
  isPdfAssetKey,
  nameOfAssetKey,
  pathOfAssetKey,
} from "@/lib/assets"
import { DEFAULT_PAGE_SIZE, paginate } from "@/lib/pagination"
import { ASSET_FOLDERS } from "@/lib/schemas/asset"
import type { AssetEntry } from "@/server/queries/assets"

interface Props {
  assets: readonly AssetEntry[]
  usage: ReadonlyMap<string, readonly string[]>
}

const MAX_VISIBLE_USED_BY = 3

function folderOf(key: string): string {
  return ASSET_FOLDERS.find((folder) => key.startsWith(`${folder}/`)) ?? pathOfAssetKey(key)
}

function kindOf(key: string): "image" | "pdf" {
  return isPdfAssetKey(key) ? "pdf" : "image"
}

function formatSize(bytes: number): string {
  return `${Math.max(1, Math.round(bytes / 1024))} Ko`
}

const FACET_VALUES: readonly {
  key: string
  value: (asset: AssetEntry) => string
}[] = [
  { key: "folder", value: (asset) => folderOf(asset.key) },
  { key: "nature", value: (asset) => kindOf(asset.key) },
]

export function AssetsBrowser({ assets, usage }: Props) {
  const [search, setSearch] = useState("")
  const [facetSelections, setFacetSelections] = useState<Record<string, Set<string>>>({})
  const [filterOpen, setFilterOpen] = useState(false)
  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState<number>(DEFAULT_PAGE_SIZE)

  // Même composition que DataTable : la recherche filtre d'abord, les compteurs de facettes se
  // calculent sur ce résultat, puis les facettes filtrent à leur tour (jamais l'inverse).
  const searchFilteredAssets = assets.filter((asset) => assetKeyMatchesQuery(asset.key, search))

  const activeFacetCount = Object.values(facetSelections).reduce(
    (sum, values) => sum + values.size,
    0,
  )

  const filteredAssets =
    activeFacetCount === 0
      ? searchFilteredAssets
      : searchFilteredAssets.filter((asset) =>
          FACET_VALUES.every(({ key, value }) => {
            const selected = facetSelections[key]
            return !selected || selected.size === 0 || selected.has(value(asset))
          }),
        )

  const {
    currentPage,
    pageCount,
    pageItems: paginatedAssets,
  } = paginate(filteredAssets, page, rowsPerPage)
  if (page > pageCount) setPage(pageCount)

  const facetGroups: readonly FacetFilterGroup[] = [
    {
      key: "folder",
      label: "Dossier",
      options: ASSET_FOLDERS.map((folder) => ({
        value: folder,
        label: `${folder}/`,
        count: searchFilteredAssets.filter((asset) => folderOf(asset.key) === folder).length,
      })),
    },
    {
      key: "nature",
      label: "Nature",
      options: [
        {
          value: "image",
          label: "Image",
          count: searchFilteredAssets.filter((asset) => kindOf(asset.key) === "image").length,
        },
        {
          value: "pdf",
          label: "PDF",
          count: searchFilteredAssets.filter((asset) => kindOf(asset.key) === "pdf").length,
        },
      ],
    },
  ]

  function toggleFacet(groupKey: string, value: string) {
    setFacetSelections((prev) => {
      const next = { ...prev }
      const current = new Set(next[groupKey] ?? [])
      if (current.has(value)) current.delete(value)
      else current.add(value)
      next[groupKey] = current
      return next
    })
    setPage(1)
  }

  function resetFilters() {
    setFacetSelections({})
    setPage(1)
  }

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
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          Aucun asset pour le moment. Déposez-en un via le bouton ci-dessus.
        </CardContent>
      </Card>
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
          onChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder="Rechercher un fichier ou un dossier"
        />
        <FacetFilter
          groups={facetGroups}
          selected={facetSelections}
          onToggle={toggleFacet}
          onReset={resetFilters}
          open={filterOpen}
          onOpenChange={setFilterOpen}
        />
      </div>

      {filteredAssets.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun résultat pour cette recherche.
          </CardContent>
        </Card>
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
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value)
              setPage(1)
            }}
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
  const shownUsedBy = usedBy.slice(0, MAX_VISIBLE_USED_BY)
  const hiddenUsedBy = usedBy.slice(MAX_VISIBLE_USED_BY)

  return (
    <Card size="sm">
      <CardContent className="flex flex-col gap-2">
        <AssetPreview assetKey={asset.key} sizes="200px" />

        <div className="flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">{formatSize(asset.size)}</span>
          <span className="inline-flex gap-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="w-5 min-w-5"
                  aria-label={`Copier le chemin de ${name}`}
                  onClick={onCopyPath}
                >
                  <Copy className="size-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copier le chemin</TooltipContent>
            </Tooltip>
            <DeleteAssetDialog assetKey={asset.key} usedBy={usedBy} />
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 border-t border-border pt-2 text-muted-foreground">
          <LinkIcon aria-hidden className="size-3 shrink-0" />
          {shownUsedBy.map((slug) => (
            <Badge key={slug} variant="secondary">
              {slug}
            </Badge>
          ))}
          {hiddenUsedBy.length > 0 ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" asChild>
                  <button
                    type="button"
                    aria-label={`Voir les rattachements supplémentaires : ${hiddenUsedBy.join(", ")}`}
                  >
                    +{hiddenUsedBy.length}
                  </button>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>{usedBy.join(", ")}</TooltipContent>
            </Tooltip>
          ) : null}
        </div>
      </CardContent>
    </Card>
  )
}
