import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { StackMarqueeSkeleton } from '@/components/features/home/StackMarqueeSkeleton'
import { Marquee } from '@/components/magicui/marquee'
import { WordRotate } from '@/components/magicui/word-rotate'
import { Button } from '@/components/ui/button'
import { Link } from '@/i18n/navigation'
import { resolveTagIcon } from '@/lib/icons'
import { findTagsBySlugs } from '@/server/queries/tags'

const STACK_TAG_SLUGS = [
  'typescript',
  'nodejs',
  'angular',
  'nextjs',
  'python',
  'fastapi',
  'postgresql',
  'mongodb',
  'n8n',
  'anthropic',
  'docker',
  'dokploy',
  'github-actions',
] as const

type Props = {
  locale: Locale
}

export async function FinalCtaSection({ locale }: Props) {
  const [tFinalCta, tStack] = await Promise.all([
    getTranslations('HomePage.finalCta'),
    getTranslations('HomePage.signatureSection'),
  ])

  const rotateWords = tFinalCta.raw('rotateWords') as string[]

  return (
    <section className="flex flex-col items-center gap-8 rounded-xl border bg-card px-6 py-12 text-center sm:py-16">
      <h2 className="flex flex-wrap items-center justify-center gap-x-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
        <span>{tFinalCta('titlePrefix')}</span>
        <WordRotate words={rotateWords} className="text-primary" />
        <span>{tFinalCta('titleSuffix')}</span>
      </h2>
      <p className="max-w-2xl text-lg text-muted-foreground">
        {tFinalCta('subtitle')}
      </p>
      <Button asChild size="lg">
        <Link href="/contact">{tFinalCta('ctaLabel')}</Link>
      </Button>

      <div className="mt-6 flex w-full flex-col items-center gap-4">
        <p className="text-sm uppercase tracking-widest text-muted-foreground">
          {tStack('title')}
        </p>
        <Suspense fallback={<StackMarqueeSkeleton />}>
          <StackMarquee locale={locale} />
        </Suspense>
      </div>
    </section>
  )
}

async function StackMarquee({ locale }: Props) {
  const stackTags = await findTagsBySlugs({ slugs: STACK_TAG_SLUGS, locale })

  return (
    <div className="relative w-full overflow-hidden">
      <Marquee className="[--duration:40s] [--gap:3rem]" pauseOnHover>
        {stackTags.map((tag) => {
          const Icon = resolveTagIcon(tag.icon)
          return (
            <div
              key={tag.slug}
              className="mx-4 flex items-center gap-3 text-muted-foreground transition hover:text-foreground"
            >
              {Icon && <Icon className="size-6" aria-hidden />}
              <span className="text-sm font-medium">{tag.name}</span>
            </div>
          )
        })}
      </Marquee>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-linear-to-r from-card to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-linear-to-l from-card to-transparent" />
    </div>
  )
}
