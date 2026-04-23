import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import type { Locale } from 'next-intl'
import { prisma } from '@/lib/prisma'
import type { ProjectType } from '@/generated/prisma/client'
import { localizeProject } from '@/i18n/localize-content'
import { PROJECT_INCLUDE, type LocalizedProjectWithRelations } from '@/types/project'

export async function findPublishedSlugs(): Promise<string[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  const rows = await prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true },
  })
  return rows.map((row) => row.slug)
}

export async function findManyPublished(params: {
  type?: ProjectType
  locale: Locale
}): Promise<LocalizedProjectWithRelations[]> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  const projects = await prisma.project.findMany({
    where: {
      status: 'PUBLISHED',
      ...(params.type && { type: params.type }),
    },
    include: PROJECT_INCLUDE,
    orderBy: { displayOrder: 'asc' },
  })
  return projects.map((p) => localizeProject(p, params.locale))
}

export async function findPublishedBySlug(
  slug: string,
  locale: Locale,
): Promise<LocalizedProjectWithRelations | null> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  const project = await prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: PROJECT_INCLUDE,
  })
  return project ? localizeProject(project, locale) : null
}
