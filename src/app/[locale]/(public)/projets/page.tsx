import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'

import { setupLocalePage } from '@/i18n/locale-guard'
import { buildLanguageAlternates, localeToOgLocale } from '@/lib/seo'
import { hasLocale, type Locale } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { findManyPublished } from '@/server/queries/projects'
import { ProjectsList } from '@/components/features/projects/ProjectsList'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/projets'>): Promise<Metadata> {
  const resolved = await params
  if (!hasLocale(routing.locales, resolved.locale)) notFound()
  const locale: Locale = resolved.locale
  const t = await getTranslations({ locale, namespace: 'Projects' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: { languages: buildLanguageAlternates('/projets') },
  }
}

export default async function ProjetsPage({ params }: PageProps<'/[locale]/projets'>) {
  await setupLocalePage(params)
  const t = await getTranslations('Projects')
  const projects = await findManyPublished()

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-14">
      <header className="mb-8 flex flex-col items-center gap-2 text-center lg:mb-10">
        <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
          {t('pageTitle')}
        </h1>
        <p className="text-lg text-muted-foreground">{t('pageSubtitle')}</p>
      </header>

      <ProjectsList projects={projects} />
    </main>
  )
}
