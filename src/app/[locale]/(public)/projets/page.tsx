import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { setupLocalePage } from '@/i18n/locale-guard'
import { buildLanguageAlternates, localeToOgLocale } from '@/lib/seo'
import { hasLocale, type Locale } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { findManyPublished } from '@/server/queries/projects'
import { ProjectsList } from '@/components/features/projects/ProjectsList'
import { ProjectsListSkeleton } from '@/components/features/projects/ProjectsListSkeleton'
import { PageShell } from '@/components/layout/PageShell'

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
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('Projects')

  return (
    <PageShell title={t('pageTitle')} subtitle={t('pageSubtitle')}>
      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsListAsync locale={locale} />
      </Suspense>
    </PageShell>
  )
}

async function ProjectsListAsync({ locale }: { locale: Locale }) {
  const projects = await findManyPublished({ locale })
  return <ProjectsList projects={projects} />
}
