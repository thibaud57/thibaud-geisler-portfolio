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
}: PageProps<'/[locale]/projets'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)

  return {
    title: t('projectsTitle'),
    description: t('projectsDescription'),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: { languages: buildLanguageAlternates('/projets') },
  }
}

export default async function ProjetsPage({ params }: PageProps<'/[locale]/projets'>) {
  await setupLocalePage(params)
  const t = await getTranslations('ProjectsPage')

  return (
    <main>
      <h1>{t('title')}</h1>
      <p>{t('placeholder')}</p>
    </main>
  )
}
