import type { Metadata, ResolvingMetadata } from 'next'
import { cacheLife } from 'next/cache'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { AboutHero } from '@/components/features/about/AboutHero'
import {
  StackSkeleton,
  StatsSkeleton,
} from '@/components/features/about/AboutSectionSkeletons'
import { NumberTickerStats } from '@/components/features/about/NumberTickerStats'
import { TechStackBadges } from '@/components/features/about/TechStackBadges'
import { PageShell } from '@/components/layout/PageShell'
import { JsonLd } from '@/components/seo/json-ld'
import { LabeledText } from '@/components/ui/labeled-text'
import { EXPERTISE } from '@/config/expertise'
import { SOCIAL_LINKS } from '@/config/social-links'
import { setupLocalePage } from '@/i18n/locale-guard'
import { buildAssetUrl } from '@/lib/assets'
import { buildOnlyConnection } from '@/lib/build-only-connection'
import {
  buildPageMetadata,
  resolveParentOgImages,
  setupLocaleMetadata,
  siteUrl,
} from '@/lib/seo'
import {
  buildProfilePagePerson,
  type ProfilePagePersonInput,
} from '@/lib/seo/json-ld'
import {
  countClientsSupported,
  countMissionsDelivered,
  findAllTags,
  getYearsOfExperience,
} from '@/server/queries/about'
import { getPublisher } from '@/server/queries/legal'

export async function generateMetadata(
  { params }: PageProps<'/[locale]/a-propos'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const [{ locale, t }, parentImages] = await Promise.all([
    setupLocaleMetadata(params),
    resolveParentOgImages(parent),
  ])
  return buildPageMetadata({
    locale,
    path: '/a-propos',
    title: t('aboutTitle'),
    description: t('aboutDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
    parentOpenGraphImages: parentImages.og,
    parentTwitterImages: parentImages.twitter,
  })
}

export default async function AProposPage({
  params,
}: PageProps<'/[locale]/a-propos'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('AboutPage')

  return (
    <PageShell>
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
        <h2>{t('stack.title')}</h2>
        <Suspense fallback={<StackSkeleton />}>
          <StackAsync locale={locale} />
        </Suspense>
      </section>

      <Suspense fallback={null}>
        <ProfileJsonLdAsync locale={locale} />
      </Suspense>
    </PageShell>
  )
}

async function ProfileJsonLdAsync({ locale }: { locale: Locale }) {
  await buildOnlyConnection()
  const [tMeta, publisher] = await Promise.all([
    getTranslations('Metadata'),
    getPublisher(),
  ])

  const sameAs = SOCIAL_LINKS.filter((link) => link.slug !== 'email').map(
    (link) => link.url,
  )
  const emailEntry = SOCIAL_LINKS.find((link) => link.slug === 'email')
  const email = emailEntry?.url.replace(/^mailto:/, '') ?? ''

  const profileJsonLd = await getCachedProfileJsonLd({
    locale,
    siteUrl,
    name: 'Thibaud Geisler',
    jobTitle: tMeta('jobTitle'),
    description: tMeta('aboutDescription'),
    email,
    image: `${siteUrl}${buildAssetUrl('branding/portrait.jpg')}`,
    sameAs,
    expertise: EXPERTISE,
    legal: publisher?.siret
      ? { siret: publisher.siret, address: publisher.address }
      : undefined,
  })

  return <JsonLd data={profileJsonLd} />
}

async function getCachedProfileJsonLd(input: ProfilePagePersonInput) {
  'use cache'
  cacheLife('days')
  return buildProfilePagePerson(input)
}

async function StatsAsync() {
  await buildOnlyConnection()
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

async function StackAsync({ locale }: { locale: Locale }) {
  await buildOnlyConnection()
  const tags = await findAllTags(locale)
  return <TechStackBadges tags={tags} />
}
