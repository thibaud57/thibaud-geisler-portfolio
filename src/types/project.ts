import type { Prisma } from '@/generated/prisma/client'

export const PROJECT_INCLUDE = {
  tags: {
    include: { tag: true },
    orderBy: { displayOrder: 'asc' },
  },
  clientMeta: {
    include: { company: true },
  },
} as const satisfies Prisma.ProjectInclude

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: typeof PROJECT_INCLUDE
}>
