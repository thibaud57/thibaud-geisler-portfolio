import type { Prisma } from "@/generated/prisma/client"
import type { LocalizedProject, LocalizedTag } from "@/i18n/localize-content"

// Champs publics uniquement : les données CRM de l'entreprise (notes, types, statut) ne doivent jamais partir dans une page publique.
export const PUBLIC_COMPANY_SELECT = {
  id: true,
  slug: true,
  name: true,
  logoFilename: true,
  websiteUrl: true,
  sectors: true,
  size: true,
} as const satisfies Prisma.CompanySelect

export const PROJECT_INCLUDE = {
  tags: {
    include: { tag: true },
    orderBy: { displayOrder: "asc" },
  },
  clientMeta: {
    include: { company: { select: PUBLIC_COMPANY_SELECT } },
  },
} as const satisfies Prisma.ProjectInclude

export type ProjectWithRelations = Prisma.ProjectGetPayload<{
  include: typeof PROJECT_INCLUDE
}>

type ProjectTagRaw = ProjectWithRelations["tags"][number]
type TagRaw = ProjectTagRaw["tag"]

export type LocalizedProjectWithRelations = LocalizedProject<TagRaw, ProjectWithRelations>
export type LocalizedProjectTag = LocalizedProjectWithRelations["tags"][number]
export type LocalizedTagRecord = LocalizedTag<TagRaw>
