'use client'

import { CalendarClock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { InlineWidget, useCalendlyEventListener } from 'react-calendly'

import { cn } from '@/lib/utils'
import { trackCalendlyEvent } from '@/server/actions/calendly'

const PAGE_SETTINGS = {
  hideEventTypeDetails: true,
  hideGdprBanner: true,
} as const

// Min-width recommandé Calendly pour l'inline embed (sous ce seuil le widget devient injouable).
const MIN_WIDTH_PX = 320
const INITIAL_HEIGHT_PX = 680
// Filtre les page_height transitoires Calendly pendant le loading (ex: 22px) qui collapsent le wrapper.
const MIN_REASONABLE_HEIGHT_PX = 400

// Padding-top interne Calendly (plan free, non configurable). Layout mobile plus serré, d'où la valeur réduite.
const TOP_PADDING_CROP_DESKTOP_PX = 70
const TOP_PADDING_CROP_MOBILE_PX = 0
const MOBILE_BREAKPOINT = '(max-width: 767px)'

type Props = {
  url: string
  placeholderLabel: string
  className?: string
}

function PlaceholderContent({ label }: { label: string }) {
  return (
    <>
      <CalendarClock className="size-10" aria-hidden />
      <p className="text-sm font-medium">{label}</p>
    </>
  )
}

export function CalendlyWidget({ url, placeholderLabel, className }: Props) {
  const [height, setHeight] = useState(INITIAL_HEIGHT_PX)
  const [cropPx, setCropPx] = useState(TOP_PADDING_CROP_DESKTOP_PX)
  const [iframeReady, setIframeReady] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_BREAKPOINT)
    const update = () =>
      setCropPx(mq.matches ? TOP_PADDING_CROP_MOBILE_PX : TOP_PADDING_CROP_DESKTOP_PX)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useCalendlyEventListener({
    onPageHeightResize: (e) => {
      const px = Number.parseInt(e.data.payload.height, 10)
      if (Number.isFinite(px) && px >= MIN_REASONABLE_HEIGHT_PX) setHeight(px)
    },
    // Trigger plus précis que onPageHeightResize qui peut firer avant le rendu visuel.
    onEventTypeViewed: () => {
      if (!iframeReady) setIframeReady(true)
    },
    onProfilePageViewed: () => {
      if (!iframeReady) setIframeReady(true)
    },
    onEventScheduled: (e) => {
      void trackCalendlyEvent({ eventUri: e.data.payload.event.uri })
    },
  })

  if (!url) {
    return (
      <div
        className={cn(
          'flex w-full flex-1 flex-col items-center justify-center min-h-[500px] gap-3 border border-border bg-card text-muted-foreground rounded-lg',
          className,
        )}
      >
        <PlaceholderContent label={placeholderLabel} />
      </div>
    )
  }

  return (
    <div
      style={{
        minWidth: MIN_WIDTH_PX,
        height: height - cropPx,
        overflow: 'hidden',
      }}
      className={cn('relative w-full', className)}
    >
      <InlineWidget
        url={url}
        pageSettings={PAGE_SETTINGS}
        styles={{ minWidth: MIN_WIDTH_PX, height, marginTop: -cropPx }}
      />
      {!iframeReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 border border-border bg-card text-muted-foreground rounded-lg">
          <PlaceholderContent label={placeholderLabel} />
        </div>
      )}
    </div>
  )
}
