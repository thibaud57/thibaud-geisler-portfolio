import type { Metadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { setupLocalePage } from '@/i18n/locale-guard'
import { buildPageMetadata, setupLocaleMetadata } from '@/lib/seo'
import type { Locale } from 'next-intl'
import { findManyPublished } from '@/server/queries/projects'
import { ProjectsList } from '@/components/features/projects/ProjectsList'
import { ProjectsListSkeleton } from '@/components/features/projects/ProjectsListSkeleton'
import { PageShell } from '@/components/layout/PageShell'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/projets'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)
  return buildPageMetadata({
    locale,
    path: '/projets',
    title: t('projectsTitle'),
    description: t('projectsDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
  })
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
