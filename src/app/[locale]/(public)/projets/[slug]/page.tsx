import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { CaseStudyLayout } from '@/components/features/projects/CaseStudyLayout'
import { setupLocalePage } from '@/i18n/locale-guard'
import { buildLanguageAlternates, localeToOgLocale, setupLocaleMetadata } from '@/lib/seo'
import { findPublishedBySlug } from '@/server/queries/projects'

export async function generateMetadata({
  params,
}: PageProps<'/[locale]/projets/[slug]'>): Promise<Metadata> {
  const { locale, slug } = await setupLocaleMetadata(params)

  const project = await findPublishedBySlug(slug, locale)
  if (!project) {
    return { title: 'Not found' }
  }

  return {
    title: project.title,
    description: project.description,
    openGraph: { locale: localeToOgLocale[locale] },
    alternates: {
      canonical: `/${locale}/projets/${slug}`,
      languages: buildLanguageAlternates(`/projets/${slug}`),
    },
  }
}

export default async function CaseStudyPage({
  params,
}: PageProps<'/[locale]/projets/[slug]'>) {
  const { locale, slug } = await setupLocalePage(params)

  const project = await findPublishedBySlug(slug, locale)
  if (!project) notFound()

  return <CaseStudyLayout project={project} />
}
