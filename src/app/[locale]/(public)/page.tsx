import type { Metadata, ResolvingMetadata } from 'next'
import { ViewTransition } from 'react'

import { FinalCtaSection } from '@/components/features/home/FinalCtaSection'
import { Hero } from '@/components/features/home/Hero'
import { ProjectsTeaserSection } from '@/components/features/home/ProjectsTeaserSection'
import { ServicesTeaserSection } from '@/components/features/home/ServicesTeaserSection'
import { MotionItem } from '@/components/ui/motion-item'
import { setupLocalePage } from '@/i18n/locale-guard'
import { buildPageMetadata, resolveParentOgImages, setupLocaleMetadata } from '@/lib/seo'
import { getTranslations } from 'next-intl/server'

export async function generateMetadata(
  { params }: PageProps<'/[locale]'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const [{ locale, t }, parentImages] = await Promise.all([
    setupLocaleMetadata(params),
    resolveParentOgImages(parent),
  ])
  return buildPageMetadata({
    locale,
    path: '',
    title: t('homeTitle'),
    description: t('homeDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
    parentOpenGraphImages: parentImages.og,
    parentTwitterImages: parentImages.twitter,
  })
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await setupLocalePage(params)
  const tHero = await getTranslations('HomePage.hero')

  return (
    <ViewTransition enter="page-fade" exit="page-fade">
      <main className="flex flex-col gap-20 pb-20 sm:gap-24 sm:pb-24 lg:gap-28 lg:pb-28">
        <Hero
          h1={tHero.rich('h1', {
            accent: (chunks) => <span className="text-primary">{chunks}</span>,
          })}
          tagline={tHero('tagline')}
          ctaPrimaryLabel={tHero('ctaPrimary')}
          ctaSecondaryLabel={tHero('ctaSecondary')}
          scrollCueAriaLabel={tHero('scrollCueAriaLabel')}
        />

        <div id="services" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 sm:px-6 lg:px-8">
          <MotionItem>
            <ServicesTeaserSection />
          </MotionItem>
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionItem>
            <ProjectsTeaserSection locale={locale} />
          </MotionItem>
        </div>

        <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
          <MotionItem>
            <FinalCtaSection locale={locale} />
          </MotionItem>
        </div>
      </main>
    </ViewTransition>
  )
}
