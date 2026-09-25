"use client"

import { useState } from "react"
import { Image as ImageIcon } from "lucide-react"

import { AssetPreview } from "@/components/features/admin/assets/AssetPreview"
import { PaginationFooter } from "@/components/features/admin/PaginationFooter"
import { SearchInput } from "@/components/features/admin/SearchInput"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { useFacetedSearch } from "@/hooks/use-faceted-search"
import { matchesAssetSearch } from "@/lib/assets"
import { DEFAULT_PAGE_SIZE } from "@/lib/pagination"
import type { AssetEntry } from "@/server/queries/assets"

interface Props {
  value: string | null
  onChange: (key: string | null) => void
  assets: AssetEntry[]
  title: string
  description: string
  triggerLabel: string
}

export function AssetPicker({ value, onChange, assets, title, description, triggerLabel }: Props) {
  const [open, setOpen] = useState(false)
  const [pickedKey, setPickedKey] = useState(value)
  const {
    search,
    setSearch,
    setPage,
    rowsPerPage,
    setRowsPerPage,
    filteredRows: filteredAssets,
    paginate,
  } = useFacetedSearch({
    rows: assets,
    matchesSearch: matchesAssetSearch,
    pageSize: DEFAULT_PAGE_SIZE,
  })

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setPickedKey(value)
      setSearch("")
    }
  }

  function handleConfirm() {
    onChange(pickedKey)
    setOpen(false)
  }

  const searchQuery = search.trim()

  const { currentPage, pageCount, pageItems: paginatedAssets } = paginate(filteredAssets)

  return (
    <div className="flex items-center gap-2">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <ImageIcon aria-hidden data-icon="inline-start" />
            {triggerLabel}
          </Button>
        </DialogTrigger>
        <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-160">
          <DialogHeader className="shrink-0">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          {/* Wrapper flex row : SearchInput porte flex-1, qui grandirait en hauteur plutôt qu'en
              largeur en enfant direct d'un flex-col. */}
          <div className="flex shrink-0">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Rechercher un fichier ou un dossier"
            />
          </div>

          {filteredAssets.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery
                ? "Aucun résultat pour cette recherche."
                : "Aucun asset dans ce dossier."}
            </p>
          ) : (
            // Colonnes posées sur la largeur de la modale, pas sur celle du viewport : des paliers
            // sm:/md: y réagiraient à un écran large alors que la boîte reste à 640px. p-1 laisse
            // sortir l'anneau de focus, que le défilement rognerait sinon.
            <div className="grid min-h-0 grid-cols-[repeat(auto-fill,minmax(140px,1fr))] gap-2 overflow-y-auto p-1">
              {paginatedAssets.map((asset) => (
                <AssetPickerTile
                  key={asset.key}
                  asset={asset}
                  selected={asset.key === pickedKey}
                  onPick={() => {
                    setPickedKey(asset.key)
                  }}
                />
              ))}
            </div>
          )}

          {filteredAssets.length > 0 ? (
            <div className="shrink-0">
              <PaginationFooter
                count={filteredAssets.length}
                noun="fichier"
                currentPage={currentPage}
                pageCount={pageCount}
                onPageChange={setPage}
                rowsPerPage={rowsPerPage}
                onRowsPerPageChange={setRowsPerPage}
              />
            </div>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Annuler
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleConfirm}>
              Choisir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {value !== null ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            onChange(null)
          }}
        >
          Retirer
        </Button>
      ) : null}
    </div>
  )
}

function AssetPickerTile({
  asset,
  selected,
  onPick,
}: {
  asset: AssetEntry
  selected: boolean
  onPick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      aria-pressed={selected}
      // Sélection portée par la bordure, comme partout dans l'admin : un anneau ou une ombre
      // déborderaient de la tuile et se feraient couper par la zone de défilement.
      className={cn(
        "rounded-md border bg-card p-2 text-left transition-colors",
        selected ? "border-primary bg-accent" : "border-border hover:border-primary/40",
      )}
    >
      <AssetPreview assetKey={asset.key} sizes="140px" />
    </button>
  )
}
