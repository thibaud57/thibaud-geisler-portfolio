import { ImageResponse } from 'next/og'
import { hasLocale } from 'next-intl'
import { notFound } from 'next/navigation'

import { routing } from '@/i18n/routing'
import { loadOgFonts } from '@/lib/seo/og-fonts'
import { OgTemplate } from '@/lib/seo/og-template'
import { findPublishedBySlug } from '@/server/queries/projects'

export const runtime = 'nodejs'

export const alt = 'Case study du projet · Thibaud Geisler'

export const size = {
  width: 1200,
  height: 630,
}

export const contentType = 'image/png'

export default async function Image({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>
}) {
  const { locale, slug } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  const [fonts, project] = await Promise.all([
    loadOgFonts(),
    findPublishedBySlug(slug, locale),
  ])

  if (!project) notFound()

  return new ImageResponse(
    (
      <OgTemplate
        kind="case-study"
        locale={locale}
        title={project.title}
        subtitle={project.description}
      />
    ),
    {
      ...size,
      fonts,
    },
  )
}
