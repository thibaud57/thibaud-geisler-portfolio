'use client'

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
  className?: string
}

export function Hero({
  h1,
  tagline,
  ctaPrimaryLabel,
  ctaSecondaryLabel,
  className,
}: Props) {
  const router = useRouter()

  return (
    <section
      className={cn(
        'relative isolate flex min-h-[70vh] w-full items-center justify-center overflow-hidden',
        className,
      )}
    >
      <BackgroundRippleEffect />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center gap-6 px-4 text-center sm:px-6">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          {h1}
        </h1>
        <p className="max-w-2xl text-lg text-muted-foreground">{tagline}</p>
        <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:gap-4">
          <ShimmerButton onClick={() => router.push('/contact')}>
            <span className="text-base font-medium">{ctaPrimaryLabel}</span>
          </ShimmerButton>
          <Button asChild variant="outline" size="lg">
            <Link href="/services">{ctaSecondaryLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  )
}
