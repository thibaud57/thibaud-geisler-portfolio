"use client"

import { FileText, Image as ImageIcon } from "lucide-react"

import { AssetImage } from "@/components/features/admin/assets/AssetImage"
import { useImageFallback } from "@/components/features/projects/useImageFallback"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { folderLabelOfAssetKey, isPdfAssetKey, nameOfAssetKey } from "@/lib/assets"
import { cn } from "@/lib/utils"

interface Props {
  assetKey: string
  sizes: string
}

// Vignette et identité d'un asset, communes à la grille de gestion et au sélecteur : un même
// fichier se présente à l'identique des deux côtés.
export function AssetPreview({ assetKey, sizes }: Props) {
  const pdf = isPdfAssetKey(assetKey)
  const { showImage, onError } = useImageFallback(pdf ? null : assetKey)
  const folder = folderLabelOfAssetKey(assetKey)
  // Le dégradé ne signale qu'une image manquante, comme la carte vide du formulaire. Derrière un
  // fichier réel il teinterait les marges laissées par le cadrage contain.
  const missing = !pdf && !showImage

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        className={cn(
          "relative flex aspect-video items-center justify-center overflow-hidden rounded-md border border-border text-muted-foreground",
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
        <div className="truncate text-sm font-medium">{nameOfAssetKey(assetKey)}</div>
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
