import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { Locale } from 'next-intl'
import type { Tag } from '@/generated/prisma/client'
import { localizeTag, type LocalizedTag } from '@/i18n/localize-content'
import { prisma } from '@/lib/prisma'

const START_YEAR = 2020

export async function getYearsOfExperience(): Promise<number> {
  'use cache'
  cacheLife('hours')
  return new Date().getFullYear() - START_YEAR
}

export async function countMissionsDelivered(): Promise<number> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  return prisma.project.count({
    where: {
      status: 'PUBLISHED',
      type: 'CLIENT',
      endedAt: { not: null },
    },
  })
}

export async function countClientsServed(): Promise<number> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  return prisma.company.count({
    where: {
      slug: { not: 'personnel' },
      clientMetas: {
        some: {
          project: { status: 'PUBLISHED', type: 'CLIENT' },
        },
      },
    },
  })
}

export async function findPublishedTags(
  locale: Locale,
): Promise<LocalizedTag<Tag>[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  const tags = await prisma.tag.findMany({
    where: {
      projects: {
        some: {
          project: { status: 'PUBLISHED' },
        },
      },
    },
    orderBy: { slug: 'asc' },
  })
  return tags.map((tag) => localizeTag(tag, locale))
}
