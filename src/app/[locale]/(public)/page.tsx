import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'

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
  await setupLocalePage(params)
  const t = await getTranslations('HomePage')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('placeholder')}</p>
    </main>
  )
}
