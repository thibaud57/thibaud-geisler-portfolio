import type { Metadata, ResolvingMetadata } from 'next'
import { notFound } from 'next/navigation'

import { CaseStudyLayout } from '@/components/features/projects/CaseStudyLayout'
import { setupLocalePage } from '@/i18n/locale-guard'
import { buildPageMetadata, resolveParentOgImages, setupLocaleMetadata } from '@/lib/seo'
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

  return <CaseStudyLayout project={project} />
}
