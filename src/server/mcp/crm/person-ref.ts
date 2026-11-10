import type { PersonRole } from "@/server/crm/person-guards"

type RoleHeld = boolean | object | null

// Un rôle est tenu quand sa fiche existe ou que son drapeau est vrai.
export const rolesOf = (held: Record<PersonRole, RoleHeld>): PersonRole[] =>
  (["lead", "contact"] as const).filter((role) => Boolean(held[role]))

type PersonToolRef =
  { id: string; name: string; optedOut?: undefined } | { id: string; name: null; optedOut: true }

// Une personne opposée n'est connue que par son identifiant : ni nom, ni email, ni LinkedIn ne sortent d'un outil.
export function personRef(person: {
  id: string
  name: string | null
  optedOutAt: Date | null
}): PersonToolRef {
  if (person.optedOutAt !== null) return { id: person.id, name: null, optedOut: true }
  // Le nom n'est nul que sur une personne opposée : le reste serait une fiche corrompue, à ne pas masquer par un nom vide.
  if (person.name === null) throw new Error(`Person ${person.id} has neither a name nor an opt-out`)
  return { id: person.id, name: person.name }
}
