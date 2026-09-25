import { ThemedImage } from "@/components/layout/ThemedImage"
import { buildAssetUrl } from "@/lib/assets"
import { cn } from "@/lib/utils"

interface Props {
  className?: string
  preload?: boolean
}

// La largeur pilote la taille : le logo est très allongé (256×23), imposer une
// hauteur ne fait que réserver du vide au-dessus et en dessous du dessin.
const LOGO_CLASSES = "h-auto w-[140px] object-contain md:w-[200px]"

export function BrandLogo({ className, preload }: Props) {
  return (
    <ThemedImage
      lightSrc={buildAssetUrl("branding/logo-horizontal-light.png")}
      darkSrc={buildAssetUrl("branding/logo-horizontal-dark.png")}
      alt="Thibaud Geisler"
      width={256}
      height={23}
      preload={preload}
      className={cn(LOGO_CLASSES, className)}
    />
  )
}
