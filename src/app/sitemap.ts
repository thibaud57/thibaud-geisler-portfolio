import type { MetadataRoute } from 'next'
import { cacheLife, cacheTag } from 'next/cache'

import { siteUrl } from '@/lib/seo'
import { buildSitemapEntries, PUBLIC_STATIC_PATHS } from '@/lib/sitemap'
import { findAllPublishedSlugs } from '@/server/queries/projects'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache'
  cacheLife('days')
  cacheTag('projects')

  const projects = await findAllPublishedSlugs()
  return buildSitemapEntries({
    staticPaths: PUBLIC_STATIC_PATHS,
    projects,
    siteUrl,
  })
}
