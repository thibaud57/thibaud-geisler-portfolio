import { AssetImage } from "@/components/features/admin/assets/AssetImage"
import { useImageFallback } from "@/components/features/projects/useImageFallback"
import { cn } from "@/lib/utils"

const SIZES = {
  sm: { box: "size-4 rounded-sm", imgSizes: "16px" },
  md: { box: "size-7 rounded-md", imgSizes: "28px" },
} as const

interface Props {
  logoFilename: string | null
  size?: keyof typeof SIZES
  className?: string
}

export function CompanyLogoTile({ logoFilename, size = "md", className }: Props) {
  const { showImage, onError } = useImageFallback(logoFilename)
  const { box, imgSizes } = SIZES[size]
  const hasImage = showImage && logoFilename !== null
  return (
    // contain sur fond neutre, comme tout aperçu de fichier (docs/DESIGN.md § Arbitrages) : un
    // logo horizontal recadré en carré n'en garde que deux lettres. Le dégradé ne signale qu'un
    // logo manquant.
    <span
      className={cn(
        "relative block overflow-hidden border border-border",
        hasImage ? "bg-muted" : "bg-linear-to-br from-primary/20 to-accent/20",
        box,
        className,
      )}
    >
      {hasImage ? (
        <AssetImage
          assetKey={logoFilename}
          alt=""
          fill
          sizes={imgSizes}
          className="object-contain"
          onError={onError}
        />
      ) : null}
    </span>
  )
}
