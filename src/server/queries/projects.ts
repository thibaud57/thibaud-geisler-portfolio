import 'server-only'
import { prisma } from '@/lib/prisma'
import type { ProjectType } from '@/generated/prisma/client'
import { PROJECT_INCLUDE, type ProjectWithRelations } from '@/types/project'

export async function findManyPublished(
  params: { type?: ProjectType } = {},
): Promise<ProjectWithRelations[]> {
  return prisma.project.findMany({
    where: {
      status: 'PUBLISHED',
      ...(params.type && { type: params.type }),
    },
    include: PROJECT_INCLUDE,
    orderBy: { displayOrder: 'asc' },
  })
}

export async function findPublishedBySlug(
  slug: string,
): Promise<ProjectWithRelations | null> {
  return prisma.project.findFirst({
    where: { slug, status: 'PUBLISHED' },
    include: PROJECT_INCLUDE,
  })
}
