import type { Person, Prisma } from "@/generated/prisma/client"

export const PERSON_FIELD_LABELS = {
  name: "Nom",
  jobRole: "Poste",
  zone: "Localité",
  email: "Email",
  phone: "Téléphone",
  linkedinUrl: "LinkedIn",
  metAt: "Date de rencontre",
  notes: "Notes",
  details: "Détails",
  companyId: "Entreprise",
  optedOutAt: "Ne plus contacter depuis le",
  exchangesErasedAt: "Échanges effacés depuis le",
} as const

export function personDisplayName(person: Pick<Person, "name" | "email" | "linkedinUrl">): string {
  return person.name ?? person.email ?? person.linkedinUrl ?? ""
}

// Tout ce qui décrit la personne ; restent l'email et le LinkedIn qui la reconnaissent.
export const OPTED_OUT_CLEARED = {
  name: null,
  jobRole: null,
  zone: null,
  phone: null,
  metAt: null,
  notes: null,
  details: null,
  companyId: null,
} satisfies Prisma.PersonUncheckedUpdateInput
