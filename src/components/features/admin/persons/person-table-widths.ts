// Sans "use client" : la page serveur en tire son squelette, la table ses largeurs (lib/admin/table-widths).

// Colonnes communes aux personnes, leads et contacts : une même donnée, une même largeur dans chaque liste.
export const PERSON_COLUMN_WIDTHS = {
  name: 208,
  zone: 104,
  linkedinUrl: 168,
  email: 168,
  phone: 168,
  notes: 224,
} as const

export const PERSON_PAGE_SKELETON: readonly string[] = [
  "h-[24px]",
  "h-[280px]",
  "h-[200px]",
  "h-[320px]",
]
