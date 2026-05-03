import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { prisma } from '@/lib/prisma'

export { findAllTags, HIDDEN_ON_ABOUT_TAG_SLUGS } from '@/server/queries/tags'

const START_YEAR = 2020

export async function getYearsOfExperience(): Promise<number> {
  'use cache'
  cacheLife('max')
  return new Date().getFullYear() - START_YEAR
}

export async function countMissionsDelivered(): Promise<number> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  const result = await prisma.clientMeta.aggregate({
    _sum: { deliverablesCount: true },
    where: {
      project: {
        status: 'PUBLISHED',
        type: 'CLIENT',
        endedAt: { not: null },
      },
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
