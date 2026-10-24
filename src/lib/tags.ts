import { TagKind } from "@/generated/prisma/browser"

const KIND_RANK = {
  EXPERTISE: 0,
  AI: 1,
  LANGUAGE: 2,
  FRAMEWORK: 3,
  DATABASE: 4,
  INFRA: 5,
} satisfies Record<TagKind, number>

export const KIND_ORDER: readonly TagKind[] = Object.values(TagKind).toSorted(
  (a, b) => KIND_RANK[a] - KIND_RANK[b],
)

export type TagCountByKind = Record<TagKind, number>

export const TAG_KIND_LABELS: Record<TagKind, string> = {
  LANGUAGE: "Langage",
  FRAMEWORK: "Framework",
  DATABASE: "BDD",
  INFRA: "Infra",
  AI: "IA",
  EXPERTISE: "Expertise",
}

export const TAG_KIND_GROUP_LABELS: Record<TagKind, string> = {
  EXPERTISE: "Expertises",
  AI: "IA",
  LANGUAGE: "Langages",
  FRAMEWORK: "Frameworks",
  DATABASE: "Bases de données",
  INFRA: "Infrastructure",
}

export const TAG_FIELD_LABELS = {
  slug: "Slug",
  displayOrder: "Ordre d'affichage",
  nameFr: "Nom (français)",
  nameEn: "Nom (anglais)",
  kind: "Catégorie",
  icon: "Icône",
  projects: "Projets",
} as const
