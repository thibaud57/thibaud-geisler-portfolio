import Image from 'next/image'

import { buildAssetUrl } from '@/lib/assets'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  priority?: boolean
}

const LOGO_CLASSES = 'h-9 w-auto max-w-[140px] object-contain md:h-10 md:max-w-[200px]'

export function BrandLogo({ className, priority }: Props) {
  return (
    <>
      <Image
        src={buildAssetUrl('branding/logo-horizontal-light.png')}
        alt="Thibaud Geisler"
        width={180}
        height={40}
        preload={priority}
        className={cn(LOGO_CLASSES, 'dark:hidden', className)}
      />
      <Image
        src={buildAssetUrl('branding/logo-horizontal-dark.png')}
        alt=""
        width={180}
        height={40}
        preload={priority}
        className={cn('hidden dark:block', LOGO_CLASSES, className)}
      />
    </>
  )
}
