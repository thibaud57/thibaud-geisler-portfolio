"use client"

import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { AssetFrame } from "@/components/features/admin/assets/AssetFrame"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { folderLabelOfAssetKey, nameOfAssetKey } from "@/lib/assets"
import { cn } from "@/lib/utils"

interface Props {
  assetKey: string
  sizes: string
  // Vignette à gauche du nom plutôt qu'au-dessus : une ligne de vue détail, pas une tuile de grille.
  row?: boolean
}

export function AssetPreview({ assetKey, sizes, row = false }: Props) {
  const folder = folderLabelOfAssetKey(assetKey)

  return (
    <div className={cn("flex min-w-0", row ? "items-center gap-3" : "flex-col gap-2")}>
      <AssetFrame
        assetKey={assetKey}
        sizes={sizes}
        className={cn(row && "w-28 shrink-0 group-hover:border-primary")}
      />

      <div className="min-w-0">
        <TruncateTooltip className="block w-full text-sm font-medium">
          {nameOfAssetKey(assetKey)}
        </TruncateTooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="block truncate font-mono text-xs text-muted-foreground">
              {folder}/
            </span>
          </TooltipTrigger>
          <TooltipContent>{assetKey}</TooltipContent>
        </Tooltip>
      </div>
    </div>
  )
}
