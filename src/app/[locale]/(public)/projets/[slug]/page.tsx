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
}: PageProps<'/[locale]/projets/[slug]'>): Promise<Metadata> {
  const { locale, slug, t } = await setupLocaleMetadata(params)

  return {
    title: t('projectTitle', { slug }),
    description: t('projectDescription', { slug }),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: {
      canonical: `/${locale}/projets/${slug}`,
      languages: buildLanguageAlternates(`/projets/${slug}`),
    },
  }
}

export default async function ProjetDetailPage({
  params,
}: PageProps<'/[locale]/projets/[slug]'>) {
  const { slug } = await setupLocalePage(params)
  const t = await getTranslations('ProjectPage')

  return (
    <main>
      <h1>{t('title', { slug })}</h1>
      <p>{t('placeholder')}</p>
    </main>
  )
}
