import Image from 'next/image'

import { buildAssetUrl } from '@/lib/assets'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  priority?: boolean
}

// La largeur pilote la taille : le logo est très allongé (256×23), imposer une
// hauteur ne fait que réserver du vide au-dessus et en dessous du dessin.
const LOGO_CLASSES = 'h-auto w-[140px] object-contain md:w-[200px]'

export function BrandLogo({ className, priority }: Props) {
  return (
    <>
      <Image
        src={buildAssetUrl('branding/logo-horizontal-light.png')}
        alt="Thibaud Geisler"
        width={256}
        height={23}
        preload={priority}
        className={cn(LOGO_CLASSES, 'dark:hidden', className)}
      />
      <Image
        src={buildAssetUrl('branding/logo-horizontal-dark.png')}
        alt="Thibaud Geisler"
        width={256}
        height={23}
        preload={priority}
        className={cn('hidden dark:block', LOGO_CLASSES, className)}
      />
    </>
  )
}
