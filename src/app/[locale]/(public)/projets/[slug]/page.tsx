import type { Metadata, ResolvingMetadata } from 'next'
import type { Locale } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'

import { CaseStudyFooter } from '@/components/features/projects/CaseStudyFooter'
import { CaseStudyHeader } from '@/components/features/projects/CaseStudyHeader'
import { TagStackGrouped } from '@/components/features/projects/TagStackGrouped'
import { PageShell } from '@/components/layout/PageShell'
import { MarkdownContent } from '@/components/markdown/MarkdownContent'
import { JsonLd } from '@/components/seo/json-ld'
import { StackedSkeleton } from '@/components/ui/stacked-skeleton'
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

  return (
    <PageShell>
      <Suspense fallback={<StackedSkeleton heights={['h-48', 'h-96', 'h-32']} />}>
        <CaseStudyContentAsync locale={locale} slug={slug} />
      </Suspense>
    </PageShell>
  )
}

async function CaseStudyContentAsync({
  locale,
  slug,
}: {
  locale: Locale
  slug: string
}) {
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
      <div className="space-y-12">
        <CaseStudyHeader project={project} />
        {project.caseStudyMarkdown ? (
          <MarkdownContent
            markdown={project.caseStudyMarkdown}
            components={{
              img: ({ src, alt }) => {
                if (typeof src !== 'string') return null
                return (
                  <figure className="my-8">
                    <Image
                      src={src}
                      alt={alt ?? ''}
                      width={1600}
                      height={900}
                      sizes="(max-width: 768px) 100vw, 1200px"
                      className="h-auto w-full rounded-lg border border-border"
                    />
                    {alt ? (
                      <figcaption className="mt-2 text-center text-sm text-muted-foreground">
                        {alt}
                      </figcaption>
                    ) : null}
                  </figure>
                )
              },
            }}
          />
        ) : null}
        <TagStackGrouped tags={project.tags} />
        <CaseStudyFooter project={project} />
      </div>
      <JsonLd data={breadcrumbJsonLd} />
    </>
  )
}

