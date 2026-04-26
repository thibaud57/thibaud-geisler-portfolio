import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { Locale } from 'next-intl'

import type { Prisma, Tag } from '@/generated/prisma/client'
import { localizeTag, type LocalizedTag } from '@/i18n/localize-content'
import { prisma } from '@/lib/prisma'

export const HIDDEN_ON_ABOUT_TAG_SLUGS = ['piagent', 'php', 'local', 'vercel']

export const TAG_LOGO_SELECT = {
  slug: true,
  nameFr: true,
  nameEn: true,
  icon: true,
} as const satisfies Prisma.TagSelect

export type TagLogo = Prisma.TagGetPayload<{ select: typeof TAG_LOGO_SELECT }>

export async function findAllTags(
  locale: Locale,
): Promise<LocalizedTag<Tag>[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('tags')
  const tags = await prisma.tag.findMany({
    where: {
      slug: { notIn: HIDDEN_ON_ABOUT_TAG_SLUGS },
    },
    orderBy: [{ displayOrder: 'asc' }, { slug: 'asc' }],
  })
  return tags.map((tag) => localizeTag(tag, locale))
}

export async function findTagsBySlugs(params: {
  slugs: readonly string[]
  locale: Locale
}): Promise<LocalizedTag<TagLogo>[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('tags')

  const tags = await prisma.tag.findMany({
    where: { slug: { in: [...params.slugs] } },
    select: TAG_LOGO_SELECT,
  })

  if (process.env.NODE_ENV !== 'production' && tags.length !== params.slugs.length) {
    const found = new Set(tags.map((t) => t.slug))
    const missing = params.slugs.filter((s) => !found.has(s))
    console.warn(
      `[findTagsBySlugs] Slugs absents en DB (silent filter) : ${missing.join(', ')}`,
    )
  }

  const bySlug = new Map(tags.map((t) => [t.slug, t]))
  return params.slugs.flatMap((slug) => {
    const tag = bySlug.get(slug)
    return tag ? [localizeTag(tag, params.locale)] : []
  })
}
