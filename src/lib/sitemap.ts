import type { MetadataRoute } from 'next'

import { routing } from '@/i18n/routing'
import { buildLanguageAlternates } from '@/lib/seo'

export const PUBLIC_STATIC_PATHS = [
  '',
  '/services',
  '/projets',
  '/a-propos',
  '/contact',
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
  const now = new Date()

  const toEntry = (path: string, lastModified: Date): MetadataRoute.Sitemap[number] => ({
    url: `${base}/${routing.defaultLocale}${path}`,
    lastModified,
    alternates: { languages: buildLanguageAlternates(path, base) },
  })

  return [
    ...staticPaths.map((path) => toEntry(path, now)),
    ...projects.map((project) => toEntry(`/projets/${project.slug}`, project.updatedAt)),
  ]
}
