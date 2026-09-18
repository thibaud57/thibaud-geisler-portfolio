import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import type { Locale } from "next-intl"

import type { Prisma, Tag } from "@/generated/prisma/client"
import { localizeTag, type LocalizedTag } from "@/i18n/localize-content"
import { prisma } from "@/lib/prisma"
import { emptyTagCountByKind, type TagCountByKind } from "@/lib/tags"

export const TAG_LOGO_SELECT = {
  slug: true,
  nameFr: true,
  nameEn: true,
  icon: true,
} as const satisfies Prisma.TagSelect

export type TagLogo = Prisma.TagGetPayload<{ select: typeof TAG_LOGO_SELECT }>

export async function findAllTags(locale: Locale): Promise<LocalizedTag<Tag>[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("tags")
  const tags = await prisma.tag.findMany({
    orderBy: [{ displayOrder: "asc" }, { slug: "asc" }],
  })
  return tags.map((tag) => localizeTag(tag, locale))
}

export async function findTagsBySlugs(params: {
  slugs: readonly string[]
  locale: Locale
}): Promise<LocalizedTag<TagLogo>[]> {
  "use cache"
  cacheLife("hours")
  cacheTag("tags")

  const tags = await prisma.tag.findMany({
    where: { slug: { in: [...params.slugs] } },
    select: TAG_LOGO_SELECT,
  })

  if (process.env.NODE_ENV !== "production" && tags.length !== params.slugs.length) {
    const found = new Set(tags.map((t) => t.slug))
    const missing = params.slugs.filter((s) => !found.has(s))
    console.warn(`[findTagsBySlugs] Slugs absents en DB (silent filter) : ${missing.join(", ")}`)
  }

  const bySlug = new Map(tags.map((t) => [t.slug, t]))
  return params.slugs.flatMap((slug) => {
    const tag = bySlug.get(slug)
    return tag ? [localizeTag(tag, params.locale)] : []
  })
}

const ADMIN_TAG_INCLUDE = {
  _count: { select: { projects: true } },
} as const satisfies Prisma.TagInclude

export type AdminTag = Prisma.TagGetPayload<{ include: typeof ADMIN_TAG_INCLUDE }>

// Sans 'use cache', contrairement à findAllTags : l'administration doit lire la base juste après
// ses propres mutations, là où la requête publique servirait un instantané antérieur.
export async function findAllTagsForAdmin(): Promise<AdminTag[]> {
  return prisma.tag.findMany({
    orderBy: [{ displayOrder: "asc" }, { slug: "asc" }],
    include: ADMIN_TAG_INCLUDE,
  })
}

// 'use cache' ici (contrairement à findAllTagsForAdmin) : sert uniquement à pré-remplir le champ
// Ordre du bouton "Nouveau tag", rendu dans l'en-tête hors de la frontière <Suspense> de la page.
// Read-your-writes préservé malgré le cache : invalidateTagCaches() appelle updateCacheTag("tags")
// après chaque mutation de tag.
export async function countTagsByKind(): Promise<TagCountByKind> {
  "use cache"
  cacheLife("hours")
  cacheTag("tags")

  const grouped = await prisma.tag.groupBy({ by: ["kind"], _count: { _all: true } })
  const countsByKind = emptyTagCountByKind()
  for (const entry of grouped) {
    countsByKind[entry.kind] = entry._count._all
  }
  return countsByKind
}
