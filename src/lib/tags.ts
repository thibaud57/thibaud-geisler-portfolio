import type { TagKind } from "@/generated/prisma/client"

export const KIND_ORDER: readonly TagKind[] = [
  "EXPERTISE",
  "AI",
  "LANGUAGE",
  "FRAMEWORK",
  "DATABASE",
  "INFRA",
]

export type TagCountByKind = Record<TagKind, number>

export function emptyTagCountByKind(): TagCountByKind {
  return Object.fromEntries(KIND_ORDER.map((kind) => [kind, 0])) as TagCountByKind
}

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

// Partagés par le formulaire tag, les colonnes de sa liste et les lignes de sa vue détail : un
// libellé qui diverge entre les trois se lit comme deux champs différents (docs/DESIGN.md
// § Arbitrages). Les clés sont les noms des champs du formulaire.
export const TAG_FIELD_LABELS = {
  slug: "Slug",
  displayOrder: "Ordre d'affichage",
  nameFr: "Nom (français)",
  nameEn: "Nom (anglais)",
  kind: "Catégorie",
  icon: "Icône",
} as const
