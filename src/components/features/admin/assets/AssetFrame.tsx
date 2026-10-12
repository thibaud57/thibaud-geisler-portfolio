"use client"

import { FileText, Image as ImageIcon } from "lucide-react"

import { AssetImage } from "@/components/features/admin/assets/AssetImage"
import { useImageFallback } from "@/components/features/public/projects/useImageFallback"
import { isPdfAssetKey } from "@/lib/assets"
import { cn } from "@/lib/utils"

interface Props {
  assetKey: string | null
  sizes: string
  className?: string
}

export function AssetFrame({ assetKey, sizes, className }: Props) {
  const pdf = assetKey !== null && isPdfAssetKey(assetKey)
  const { showImage, onError } = useImageFallback(pdf ? null : assetKey)
  // Le dégradé ne signale qu'une image manquante : derrière un fichier réel il teinterait les marges laissées par le cadrage contain.
  const missing = !pdf && !showImage

  return (
    <div
      className={cn(
        "relative flex aspect-video items-center justify-center overflow-hidden rounded-md border border-border text-muted-foreground",
        missing ? "bg-linear-to-br from-primary/20 to-accent/20" : "bg-muted",
        className,
      )}
    >
      {showImage && assetKey !== null ? (
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
  )
}
