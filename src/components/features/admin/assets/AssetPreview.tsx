"use client"

import { FileText, Image as ImageIcon } from "lucide-react"

import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { AssetImage } from "@/components/features/admin/assets/AssetImage"
import { useImageFallback } from "@/components/features/projects/useImageFallback"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { folderLabelOfAssetKey, isPdfAssetKey, nameOfAssetKey } from "@/lib/assets"
import { cn } from "@/lib/utils"

interface Props {
  assetKey: string
  sizes: string
  // Vignette à gauche du nom plutôt qu'au-dessus : une ligne de vue détail, pas une tuile de grille.
  row?: boolean
}

export function AssetPreview({ assetKey, sizes, row = false }: Props) {
  const pdf = isPdfAssetKey(assetKey)
  const { showImage, onError } = useImageFallback(pdf ? null : assetKey)
  const folder = folderLabelOfAssetKey(assetKey)
  // Le dégradé ne signale qu'une image manquante, comme la carte vide du formulaire. Derrière un
  // fichier réel il teinterait les marges laissées par le cadrage contain.
  const missing = !pdf && !showImage

  return (
    <div className={cn("flex min-w-0", row ? "items-center gap-3" : "flex-col gap-2")}>
      <div
        className={cn(
          "relative flex aspect-video items-center justify-center overflow-hidden rounded-md border border-border text-muted-foreground",
          row && "w-28 shrink-0 group-hover:border-primary",
          missing ? "bg-linear-to-br from-primary/20 to-accent/20" : "bg-muted",
        )}
      >
        {!pdf && showImage ? (
          // contain, jamais cover : un gestionnaire d'assets montre le fichier entier, un logo
          // carré recadré au format 16/9 devient méconnaissable.
          <AssetImage
            assetKey={assetKey}
            alt=""
            fill
            sizes={sizes}
            className="object-contain"
            onError={onError}
          />
        ) : pdf ? (
          <FileText className="size-5" />
        ) : (
          <ImageIcon className="size-5" />
        )}
      </div>

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
