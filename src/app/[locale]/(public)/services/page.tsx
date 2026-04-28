import type { Metadata, ResolvingMetadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildPageMetadata,
  resolveParentOgImages,
  setupLocaleMetadata,
  siteUrl,
} from '@/lib/seo'
import { buildBreadcrumbList } from '@/lib/seo/json-ld'

import { MotionItem } from '@/components/features/services/MotionItem'
import { ServiceCard } from '@/components/features/services/ServiceCard'
import { SERVICE_SLUGS } from '@/components/features/services/service-slugs'
import { PageShell } from '@/components/layout/PageShell'
import { JsonLd } from '@/components/seo/json-ld'

export async function generateMetadata(
  { params }: PageProps<'/[locale]/services'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const [{ locale, t }, parentImages] = await Promise.all([
    setupLocaleMetadata(params),
    resolveParentOgImages(parent),
  ])
  return buildPageMetadata({
    locale,
    path: '/services',
    title: t('servicesTitle'),
    description: t('servicesDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
    parentOpenGraphImages: parentImages.og,
    parentTwitterImages: parentImages.twitter,
  })
}

export default async function ServicesPage({ params }: PageProps<'/[locale]/services'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('ServicesPage')
  const tMeta = await getTranslations({ locale, namespace: 'Metadata' })
  const breadcrumbJsonLd = buildBreadcrumbList({
    locale,
    siteUrl,
    items: [
      { name: tMeta('breadcrumbHome'), path: '' },
      { name: tMeta('breadcrumbServices'), path: '/services' },
    ],
  })

  return (
    <PageShell title={t('title')} subtitle={t('subtitle')}>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {SERVICE_SLUGS.map((slug, index) => (
          <MotionItem key={slug} index={index}>
            <ServiceCard
              slug={slug}
              title={t(`offers.${slug}.title`)}
              description={t(`offers.${slug}.description`)}
              bullets={t.raw(`offers.${slug}.bullets`) as string[]}
              ctaLabel={t(`offers.${slug}.ctaLabel`)}
            />
          </MotionItem>
        ))}
      </div>
      <JsonLd data={breadcrumbJsonLd} />
    </PageShell>
  )
}
