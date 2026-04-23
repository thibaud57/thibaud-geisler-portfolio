import { type ComponentPropsWithoutRef, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

type BentoGridProps = ComponentPropsWithoutRef<'div'> & {
  children: ReactNode
}

type BentoCardProps = ComponentPropsWithoutRef<'div'> & {
  children: ReactNode
}

function BentoGrid({ children, className, ...props }: BentoGridProps) {
  return (
    <div
      className={cn(
        'grid w-full grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

function BentoCard({ children, className, ...props }: BentoCardProps) {
  return (
    <div
      className={cn(
        'group relative flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-sm',
        'transition-all duration-300 hover:shadow-xl',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export { BentoCard, BentoGrid }
