import type { MetadataRoute } from 'next'
import { cacheLife } from 'next/cache'

import { routing } from '@/i18n/routing'
import { buildLanguageAlternates, siteUrl } from '@/lib/seo'

const publicPaths = ['', '/services', '/projets', '/a-propos', '/contact'] as const

// TODO: ajouter les projets publiés (Prisma) avec leurs slugs dynamiques quand
// la Feature 2 — Projets arrivera. Pattern : getPublishedProjects() puis
// projects.map((p) => localizedEntry(`/projets/${p.slug}`, p.updatedAt)).

function localizedEntry(path: string): MetadataRoute.Sitemap[number] {
  return {
    url: `${siteUrl}/${routing.defaultLocale}${path}`,
    lastModified: new Date(),
    alternates: { languages: buildLanguageAlternates(path, siteUrl) },
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache'
  cacheLife('days')
  return publicPaths.map(localizedEntry)
}
