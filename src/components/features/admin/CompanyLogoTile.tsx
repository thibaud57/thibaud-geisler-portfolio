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
  return (
    <span
      className={cn(
        "relative block overflow-hidden border border-border bg-linear-to-br from-primary/20 to-accent/20",
        box,
        className,
      )}
    >
      {showImage && logoFilename ? (
        <AssetImage
          assetKey={logoFilename}
          alt=""
          fill
          sizes={imgSizes}
          className="object-cover"
          onError={onError}
        />
      ) : null}
    </span>
  )
}
