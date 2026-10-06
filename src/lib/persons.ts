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

export const OPTED_OUT_LABEL = "Ne plus contacter"

export type PersonRef = Pick<Person, "id" | "name" | "email" | "linkedinUrl">

export function personDisplayName(person: Pick<Person, "name" | "email" | "linkedinUrl">): string {
  return person.name ?? person.email ?? person.linkedinUrl ?? ""
}

// Sans email ni LinkedIn, rien ne permettrait de reconnaître la personne : sa fiche n'a plus d'objet.
export function optOutDeletesPerson(person: Pick<Person, "email" | "linkedinUrl">): boolean {
  return !person.email && !person.linkedinUrl
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

// Titres des blocs communs à toute personne, quel que soit son rôle.
export const PERSON_SECTION_TITLES = {
  person: "Identité",
  contact: "Coordonnées",
  notes: "Notes",
  details: "Détails",
  optOut: "Opposition",
} as const
