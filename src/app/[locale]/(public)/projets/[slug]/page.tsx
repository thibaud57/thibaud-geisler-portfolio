import type { Metadata, ResolvingMetadata } from 'next'
import { getTranslations } from 'next-intl/server'
import { notFound } from 'next/navigation'

import { CaseStudyLayout } from '@/components/features/projects/CaseStudyLayout'
import { JsonLd } from '@/components/seo/json-ld'
import { setupLocalePage } from '@/i18n/locale-guard'
import {
  buildPageMetadata,
  resolveParentOgImages,
  setupLocaleMetadata,
  siteUrl,
} from '@/lib/seo'
import { buildBreadcrumbList } from '@/lib/seo/json-ld'
import { findPublishedBySlug } from '@/server/queries/projects'

export async function generateMetadata(
  { params }: PageProps<'/[locale]/projets/[slug]'>,
  parent: ResolvingMetadata,
): Promise<Metadata> {
  const [{ locale, slug, t }, parentImages] = await Promise.all([
    setupLocaleMetadata(params),
    resolveParentOgImages(parent),
  ])

  const project = await findPublishedBySlug(slug, locale)
  if (!project) notFound()

  return buildPageMetadata({
    locale,
    path: `/projets/${slug}`,
    title: project.title,
    description: project.description,
    siteName: t('siteTitle'),
    ogType: 'article',
    parentOpenGraphImages: parentImages.og,
    parentTwitterImages: parentImages.twitter,
  })
}

export default async function CaseStudyPage({
  params,
}: PageProps<'/[locale]/projets/[slug]'>) {
  const { locale, slug } = await setupLocalePage(params)

  const project = await findPublishedBySlug(slug, locale)
  if (!project) notFound()

  const tMeta = await getTranslations({ locale, namespace: 'Metadata' })
  const breadcrumbJsonLd = buildBreadcrumbList({
    locale,
    siteUrl,
    items: [
      { name: tMeta('breadcrumbHome'), path: '' },
      { name: tMeta('breadcrumbProjects'), path: '/projets' },
      { name: project.title, path: `/projets/${slug}` },
    ],
  })

  return (
    <>
      <CaseStudyLayout project={project} />
      <JsonLd data={breadcrumbJsonLd} />
    </>
  )
}
