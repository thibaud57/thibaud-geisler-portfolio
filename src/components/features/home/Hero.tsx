'use client'

import { ChevronDown } from 'lucide-react'

import { BackgroundRippleEffect } from '@/components/aceternity/background-ripple-effect'
import { ShimmerButton } from '@/components/ui/shimmer-button'
import { Button } from '@/components/ui/button'
import { Link, useRouter } from '@/i18n/navigation'
import { cn } from '@/lib/utils'

type Props = {
  h1: string
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
  const router = useRouter()

  return (
    <section
      className={cn(
        'relative isolate flex min-h-[calc(100vh-4rem)] w-full items-start justify-center overflow-hidden pt-[18vh] pb-24',
        className,
      )}
    >
      <BackgroundRippleEffect />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {h1}
        </h1>
        <p className="max-w-2xl whitespace-pre-line text-lg text-muted-foreground">
          {tagline}
        </p>
        <div className="mt-2 flex flex-col items-center gap-3 sm:flex-row sm:gap-4">
          <ShimmerButton
            onClick={() => router.push('/contact')}
            background="var(--primary)"
          >
            <span className="text-base font-medium text-primary-foreground">
              {ctaPrimaryLabel}
            </span>
          </ShimmerButton>
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
