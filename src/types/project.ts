import type { Prisma } from '@/generated/prisma/client'
import type { LocalizedProject, LocalizedTag } from '@/i18n/localize-content'

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

type ProjectTagRaw = ProjectWithRelations['tags'][number]
type TagRaw = ProjectTagRaw['tag']

export type LocalizedProjectWithRelations = LocalizedProject<TagRaw, ProjectWithRelations>
export type LocalizedProjectTag = LocalizedProjectWithRelations['tags'][number]
export type LocalizedTagRecord = LocalizedTag<TagRaw>
