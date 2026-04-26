import type { Metadata } from 'next'

import { FinalCtaSection } from '@/components/features/home/FinalCtaSection'
import { Hero } from '@/components/features/home/Hero'
import { ProjectsTeaserSection } from '@/components/features/home/ProjectsTeaserSection'
import { ServicesTeaserSection } from '@/components/features/home/ServicesTeaserSection'
import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'
import { getTranslations } from 'next-intl/server'



export async function generateMetadata({
  params,
}: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)

  return {
    title: t('homeTitle'),
    description: t('homeDescription'),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: { languages: buildLanguageAlternates('') },
  }
}

export default async function HomePage({ params }: PageProps<'/[locale]'>) {
  const { locale } = await setupLocalePage(params)
  const tHero = await getTranslations('HomePage.hero')

  return (
    <main className="flex flex-col gap-20 pb-20 sm:gap-24 sm:pb-24 lg:gap-28 lg:pb-28">
      <Hero
        h1={tHero('h1')}
        tagline={tHero('tagline')}
        ctaPrimaryLabel={tHero('ctaPrimary')}
        ctaSecondaryLabel={tHero('ctaSecondary')}
        scrollCueAriaLabel={tHero('scrollCueAriaLabel')}
      />

      <div id="services" className="mx-auto w-full max-w-7xl scroll-mt-16 px-4 sm:px-6 lg:px-8">
        <ServicesTeaserSection />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <ProjectsTeaserSection locale={locale} />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <FinalCtaSection locale={locale} />
      </div>
    </main>
  )
}
