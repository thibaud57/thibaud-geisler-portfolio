import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

type Props = {
  heights: string[]
  className?: string
}

export function StackedSkeleton({ heights, className }: Props) {
  return (
    <div className={cn('space-y-12', className)} aria-hidden>
      {heights.map((height, index) => (
        <Skeleton key={index} className={cn(height, 'w-full')} />
      ))}
    </div>
  )
}
