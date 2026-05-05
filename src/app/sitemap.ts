import type { MetadataRoute } from 'next'

import { buildOnlyConnection } from '@/lib/build-only-connection'
import { siteUrl } from '@/lib/seo'
import { buildSitemapEntries, PUBLIC_STATIC_PATHS } from '@/lib/sitemap'
import { findAllPublishedSlugs } from '@/server/queries/projects'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await buildOnlyConnection()
  const projects = await findAllPublishedSlugs()
  return buildSitemapEntries({
    staticPaths: PUBLIC_STATIC_PATHS,
    projects,
    siteUrl,
  })
}
