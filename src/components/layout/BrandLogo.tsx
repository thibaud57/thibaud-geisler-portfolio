import Image from 'next/image'

import { buildAssetUrl } from '@/lib/assets'
import { cn } from '@/lib/utils'

type Props = {
  className?: string
  priority?: boolean
}

export function BrandLogo({ className, priority }: Props) {
  return (
    <>
      <Image
        src={buildAssetUrl('branding/logo-horizontal-light.png')}
        alt="Thibaud Geisler"
        width={180}
        height={40}
        preload={priority}
        className={cn('h-10 w-auto max-w-[200px] object-contain dark:hidden', className)}
      />
      <Image
        src={buildAssetUrl('branding/logo-horizontal-dark.png')}
        alt=""
        width={180}
        height={40}
        preload={priority}
        className={cn('hidden h-10 w-auto max-w-[200px] object-contain dark:block', className)}
      />
    </>
  )
}
