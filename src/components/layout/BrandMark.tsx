import { ThemedImage } from "@/components/layout/ThemedImage"
import { buildAssetUrl } from "@/lib/assets"
import { cn } from "@/lib/utils"

export function BrandMark({ className }: { className?: string }) {
  return (
    <ThemedImage
      lightSrc={buildAssetUrl("branding/favicon-light.png")}
      darkSrc={buildAssetUrl("branding/favicon-dark.png")}
      alt="Thibaud Geisler"
      width={32}
      height={20}
      className={cn("h-auto w-6 object-contain", className)}
    />
  )
}
