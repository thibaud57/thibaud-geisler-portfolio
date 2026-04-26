import FR from 'country-flag-icons/react/3x2/FR'
import LU from 'country-flag-icons/react/3x2/LU'
import { Globe } from 'lucide-react'

import { cn } from '@/lib/utils'

type Props = {
  className?: string
}

export function LocationLine({ className }: Props) {
  return (
    <ul
      className={cn(
        'flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground',
        className,
      )}
    >
      <li className="flex items-center gap-2">
        <FR className="h-3.5 w-auto" aria-hidden />
        <span>Grand Est</span>
      </li>
      <li className="flex items-center gap-2">
        <LU className="h-3.5 w-auto" aria-hidden />
        <span>Luxembourg</span>
      </li>
      <li className="flex items-center gap-2">
        <Globe className="size-4" aria-hidden />
        <span>Remote</span>
      </li>
    </ul>
  )
}
