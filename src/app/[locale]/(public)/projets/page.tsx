import type { Metadata, ResolvingMetadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { Suspense } from 'react'

import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildPageMetadata,
  resolveParentOgImages,
  setupLocaleMetadata,
  siteUrl,
} from '@/lib/seo'
import { buildBreadcrumbList } from '@/lib/seo/json-ld'
import type { Locale } from 'next-intl'
import { findManyPublished } from '@/server/queries/projects'
import { ProjectsList } from '@/components/features/projects/ProjectsList'
import { ProjectsListSkeleton } from '@/components/features/projects/ProjectsListSkeleton'
import { PageShell } from '@/components/layout/PageShell'
import { JsonLd } from '@/components/seo/json-ld'

export async function generateMetadata(
  { params }: PageProps<'/[locale]/projets'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const [{ locale, t }, parentImages] = await Promise.all([
    setupLocaleMetadata(params),
    resolveParentOgImages(parent),
  ])
  return buildPageMetadata({
    locale,
    path: '/projets',
    title: t('projectsTitle'),
    description: t('projectsDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
    parentOpenGraphImages: parentImages.og,
    parentTwitterImages: parentImages.twitter,
  })
}

export default async function ProjetsPage({ params }: PageProps<'/[locale]/projets'>) {
  const { locale } = await setupLocalePage(params)
  const t = await getTranslations('Projects')
  const tMeta = await getTranslations({ locale, namespace: 'Metadata' })
  const breadcrumbJsonLd = buildBreadcrumbList({
    locale,
    siteUrl,
    items: [
      { name: tMeta('breadcrumbHome'), path: '' },
      { name: tMeta('breadcrumbProjects'), path: '/projets' },
    ],
  })

  return (
    <PageShell title={t('pageTitle')} subtitle={t('pageSubtitle')}>
      <Suspense fallback={<ProjectsListSkeleton />}>
        <ProjectsListAsync locale={locale} />
      </Suspense>
      <JsonLd data={breadcrumbJsonLd} />
    </PageShell>
  )
}

async function ProjectsListAsync({ locale }: { locale: Locale }) {
  const projects = await findManyPublished({ locale })
  return <ProjectsList projects={projects} />
}
