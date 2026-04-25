'use client'

import { NumberTicker } from '@/components/magicui/number-ticker'
import { cn } from '@/lib/utils'

export type Stat = {
  slug: string
  value: number
  label: string
  suffix?: string
}

type Props = {
  stats: Stat[]
  className?: string
}

export function NumberTickerStats({ stats, className }: Props) {
  return (
    <div
      className={cn(
        'grid gap-10 sm:grid-cols-3',
        className,
      )}
    >
      {stats.map((stat) => (
        <div
          key={stat.slug}
          className="flex flex-col items-center gap-2 text-center"
        >
          <div className="font-display text-5xl font-bold text-primary sm:text-6xl">
            <NumberTicker value={stat.value} />
            {stat.suffix ? <span>{stat.suffix}</span> : null}
          </div>
          <div className="text-base text-muted-foreground">{stat.label}</div>
        </div>
      ))}
    </div>
  )
}
