import type { Metadata } from 'next'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { AboutHero } from '@/components/features/about/AboutHero'
import { NumberTickerStats } from '@/components/features/about/NumberTickerStats'
import { TechStackBadges } from '@/components/features/about/TechStackBadges'
import { PageShell } from '@/components/layout/PageShell'
import { LabeledText } from '@/components/ui/labeled-text'
import { Skeleton } from '@/components/ui/skeleton'
import { setupLocalePage } from '@/i18n/locale-guard'
import { buildPageMetadata, setupLocaleMetadata } from '@/lib/seo'
import {
  countClientsSupported,
  countMissionsDelivered,
  findAllTags,
  getYearsOfExperience,
} from '@/server/queries/about'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/a-propos'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)
  return buildPageMetadata({
    locale,
    path: '/a-propos',
    title: t('aboutTitle'),
    description: t('aboutDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
  })
}

export default async function AProposPage({
  params,
}: PageProps<'/[locale]/a-propos'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('AboutPage')

  return (
    <PageShell>
      <div className="flex flex-col gap-16 sm:gap-20 lg:gap-24">
        <AboutHero locale={locale}>
          <div className="mt-2 flex flex-col gap-4">
            <p className="text-base leading-relaxed">
              <LabeledText text={t('bio.intro')} />
            </p>
            <p className="text-base leading-relaxed">
              <LabeledText text={t('bio.positioning')} />
            </p>
            <p className="text-base leading-relaxed">
              <LabeledText text={t('bio.approach')} />
            </p>
          </div>
        </AboutHero>

        <blockquote className="mx-auto max-w-4xl text-center">
          <p className="text-2xl italic leading-relaxed text-muted-foreground sm:text-3xl">
            <span aria-hidden className="text-primary">«&nbsp;</span>
            {t('transition')}
            <span aria-hidden className="text-primary">&nbsp;»</span>
          </p>
        </blockquote>

        <section className="border-y border-border py-16 sm:py-20 lg:py-24">
          <Suspense fallback={<StatsSkeleton />}>
            <StatsAsync />
          </Suspense>
        </section>

        <section className="flex flex-col gap-6">
          <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            {t('stack.title')}
          </h2>
          <Suspense fallback={<StackSkeleton />}>
            <StackAsync locale={locale} />
          </Suspense>
        </section>
      </div>
    </PageShell>
  )
}

async function StatsAsync() {
  const [t, years, missions, clients] = await Promise.all([
    getTranslations('AboutPage.stats'),
    getYearsOfExperience(),
    countMissionsDelivered(),
    countClientsSupported(),
  ])
  const stats = [
    { slug: 'years', value: years, label: t('years.label') },
    { slug: 'clients', value: clients, label: t('clients.label') },
    { slug: 'missions', value: missions, label: t('missions.label') },
  ]
  return <NumberTickerStats stats={stats} />
}

function StatsSkeleton() {
  return (
    <div className="grid gap-10 sm:grid-cols-3" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col items-center gap-2 text-center">
          <Skeleton className="h-14 w-20" />
          <Skeleton className="h-4 w-32" />
        </div>
      ))}
    </div>
  )
}

async function StackAsync({ locale }: { locale: Locale }) {
  const tags = await findAllTags(locale)
  return <TechStackBadges tags={tags} />
}

function StackSkeleton() {
  return (
    <div className="flex flex-col gap-8" aria-hidden>
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="flex flex-col gap-3">
          <Skeleton className="h-6 w-40" />
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 4 }, (_, j) => (
              <Skeleton key={j} className="h-6 w-20" />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
