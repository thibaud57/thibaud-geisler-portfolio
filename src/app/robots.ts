import type { MetadataRoute } from 'next'

import { siteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      // /api/assets sert des fichiers publics par nature (ADR-011) : portrait du JSON-LD, CV,
      // visuels de projets. Sans cet Allow, le Disallow /api/ les interdit au crawl.
      allow: ['/', '/api/assets/'],
      disallow: '/api/',
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
