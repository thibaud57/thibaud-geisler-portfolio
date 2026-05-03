import { ChevronDown } from 'lucide-react'

import { BackgroundRippleEffect } from '@/components/aceternity/background-ripple-effect'
import { HyperText } from '@/components/magicui/hyper-text'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

import { HeroPrimaryCta } from './HeroPrimaryCta'

type Props = {
  h1: React.ReactNode
  tagline: string
  ctaPrimaryLabel: string
  ctaSecondaryLabel: string
  scrollCueAriaLabel: string
  className?: string
}

export function Hero({
  h1,
  tagline,
  ctaPrimaryLabel,
  ctaSecondaryLabel,
  scrollCueAriaLabel,
  className,
}: Props) {
  return (
    <section
      className={cn(
        'relative isolate flex min-h-[calc(100vh-4rem)] w-full items-start justify-center overflow-hidden pt-[18vh] pb-24',
        className,
      )}
    >
      <BackgroundRippleEffect />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h1 className="lg:text-6xl">{h1}</h1>
        <div className="relative max-w-2xl overflow-hidden">
          <p
            aria-hidden
            className="invisible whitespace-pre-line text-lg text-muted-foreground sm:text-xl"
          >
            {tagline}
          </p>
          <HyperText
            as="p"
            revealOrder="random"
            className="absolute inset-0 py-0 text-lg font-normal text-muted-foreground sm:text-xl"
          >
            {tagline}
          </HyperText>
        </div>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <HeroPrimaryCta label={ctaPrimaryLabel} />
          <Button asChild variant="outline" size="lg" className="h-12 rounded-full px-8 text-base font-medium">
            <Link href="/projets">{ctaSecondaryLabel}</Link>
          </Button>
        </div>
      </div>

      <a
        href="#services"
        aria-label={scrollCueAriaLabel}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-muted-foreground transition hover:text-primary"
      >
        <ChevronDown className="size-8 motion-safe:animate-bounce" aria-hidden />
      </a>
    </section>
  )
}
