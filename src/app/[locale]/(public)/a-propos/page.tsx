import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { DownloadCvButton } from '@/components/features/about/DownloadCvButton'
import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/a-propos'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)

  return {
    title: t('aboutTitle'),
    description: t('aboutDescription'),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: { languages: buildLanguageAlternates('/a-propos') },
  }
}

export default async function AProposPage({ params }: PageProps<'/[locale]/a-propos'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('AboutPage')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('placeholder')}</p>
      <div className="mt-6">
        <DownloadCvButton locale={locale} />
      </div>
    </main>
  )
}
