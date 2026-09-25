import type { MetadataRoute } from "next"

import { ADMIN_ROOT } from "@/lib/admin-routes"
import { siteUrl } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // /api/assets sert des fichiers publics par nature (ADR-011) : portrait du JSON-LD, CV,
      // visuels de projets. Sans cet Allow, le Disallow /api/ les interdit au crawl.
      allow: ["/", "/api/assets/"],
      disallow: ["/api/", ADMIN_ROOT],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  }
}
