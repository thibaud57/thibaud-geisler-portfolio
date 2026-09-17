import type { TagKind } from "@/generated/prisma/client"

export const KIND_ORDER: readonly TagKind[] = [
  "EXPERTISE",
  "AI",
  "LANGUAGE",
  "FRAMEWORK",
  "DATABASE",
  "INFRA",
]

export const TAG_KIND_LABELS: Record<TagKind, string> = {
  LANGUAGE: "Langage",
  FRAMEWORK: "Framework",
  DATABASE: "Base de données",
  INFRA: "Infra",
  AI: "IA",
  EXPERTISE: "Expertise",
}
