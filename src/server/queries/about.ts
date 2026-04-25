import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { Locale } from 'next-intl'
import type { Tag } from '@/generated/prisma/client'
import { localizeTag, type LocalizedTag } from '@/i18n/localize-content'
import { prisma } from '@/lib/prisma'

const START_YEAR = 2020

export const HIDDEN_ON_ABOUT_TAG_SLUGS = ['piagent', 'php', 'local', 'vercel']

export async function getYearsOfExperience(): Promise<number> {
  'use cache'
  cacheLife('hours')
  return new Date().getFullYear() - START_YEAR
}

export async function countMissionsDelivered(): Promise<number> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  const result = await prisma.project.aggregate({
    _sum: { deliverablesCount: true },
    where: {
      status: 'PUBLISHED',
      type: 'CLIENT',
      endedAt: { not: null },
    },
  })
  return result._sum.deliverablesCount ?? 0
}

export async function countClientsSupported(): Promise<number> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  return prisma.company.count({
    where: {
      clientMetas: {
        some: {
          project: { status: 'PUBLISHED', type: 'CLIENT' },
        },
      },
    },
  })
}

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
