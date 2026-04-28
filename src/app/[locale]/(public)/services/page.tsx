import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'
import { buildPageMetadata, setupLocaleMetadata } from '@/lib/seo'

import { MotionItem } from '@/components/features/services/MotionItem'
import { ServiceCard } from '@/components/features/services/ServiceCard'
import { SERVICE_SLUGS } from '@/components/features/services/service-slugs'
import { PageShell } from '@/components/layout/PageShell'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/services'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)
  return buildPageMetadata({
    locale,
    path: '/services',
    title: t('servicesTitle'),
    description: t('servicesDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
  })
}

export default async function ServicesPage({ params }: PageProps<'/[locale]/services'>) {
  await setupLocalePage(params)
  const t = await getTranslations('ServicesPage')

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
    </PageShell>
  )
}
