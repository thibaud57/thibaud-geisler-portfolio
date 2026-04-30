'use client'

import { useConsentManager } from '@c15t/nextjs'
import { CalendarClock, Cookie } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useState, type ReactNode } from 'react'
import { InlineWidget, useCalendlyEventListener } from 'react-calendly'

import { OpenCookiePreferencesButton } from '@/components/features/legal/OpenCookiePreferencesButton'
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

type PlaceholderShellProps = {
  icon: ReactNode
  label: string
  action?: ReactNode
  className?: string
}

function PlaceholderShell({ icon, label, action, className }: PlaceholderShellProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-1 flex-col items-center justify-center min-h-[500px] gap-3 border border-border bg-card text-muted-foreground rounded-lg',
        className,
      )}
    >
      {icon}
      <p className="max-w-md text-center text-sm font-medium">{label}</p>
      {action}
    </div>
  )
}

export function CalendlyWidget({ url, placeholderLabel, className }: Props) {
  const { has } = useConsentManager()
  const marketingAccepted = has('marketing')
  const tCookies = useTranslations('Cookies.calendlyGated')

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

  if (!marketingAccepted) {
    return (
      <PlaceholderShell
        icon={<Cookie className="size-10" aria-hidden />}
        label={tCookies('label')}
        action={<OpenCookiePreferencesButton variant="default" label={tCookies('cta')} />}
        className={cn('gap-4 p-6', className)}
      />
    )
  }

  if (!url) {
    return (
      <PlaceholderShell
        icon={<CalendarClock className="size-10" aria-hidden />}
        label={placeholderLabel}
        className={className}
      />
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
        <PlaceholderShell
          icon={<CalendarClock className="size-10" aria-hidden />}
          label={placeholderLabel}
          className="absolute inset-0 min-h-0 w-auto flex-none"
        />
      )}
    </div>
  )
}
