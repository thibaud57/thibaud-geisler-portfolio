'use client'

import { CalendarClock } from 'lucide-react'
import Script from 'next/script'

import { cn } from '@/lib/utils'

type Props = {
  url: string
  placeholderLabel: string
  className?: string
}

export function CalendlyWidget({ url, placeholderLabel, className }: Props) {
  if (!url) {
    return (
      <div
        className={cn(
          'flex min-h-[500px] w-full flex-1 flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/40 text-muted-foreground',
          className,
        )}
      >
        <CalendarClock className="size-10" aria-hidden />
        <p className="text-sm font-medium">{placeholderLabel}</p>
      </div>
    )
  }

  return (
    <>
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="lazyOnload"
      />
      <div
        className={cn('calendly-inline-widget min-h-[500px] w-full flex-1', className)}
        data-url={url}
        data-resize="true"
      />
    </>
  )
}
