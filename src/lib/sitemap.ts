import type { MetadataRoute } from 'next'

import { routing } from '@/i18n/routing'
import { buildLanguageAlternates } from '@/lib/seo'

export const PUBLIC_STATIC_PATHS = [
  '',
  '/services',
  '/projets',
  '/a-propos',
  '/contact',
  '/mentions-legales',
  '/confidentialite',
] as const

type SitemapProject = {
  slug: string
  updatedAt: Date
}

type BuildSitemapEntriesInput = {
  staticPaths: readonly string[]
  projects: readonly SitemapProject[]
  siteUrl: string
}

export function buildSitemapEntries({
  staticPaths,
  projects,
  siteUrl,
}: BuildSitemapEntriesInput): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/$/, '')

  // Pas de lastModified sur les pages statiques : aucune date de contenu fiable n'existe pour
  // elles, et une date qui change à chaque requête finit ignorée par Google.
  const toEntriesPerLocale = (
    path: string,
    lastModified?: Date,
  ): MetadataRoute.Sitemap => {
    const languages = buildLanguageAlternates(path, base)
    return routing.locales.map((locale) => ({
      url: `${base}/${locale}${path}`,
      ...(lastModified && { lastModified }),
      alternates: { languages },
    }))
  }

  return [
    ...staticPaths.flatMap((path) => toEntriesPerLocale(path)),
    ...projects.flatMap((project) =>
      toEntriesPerLocale(`/projets/${project.slug}`, project.updatedAt),
    ),
  ]
}
