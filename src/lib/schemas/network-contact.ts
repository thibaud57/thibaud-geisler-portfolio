import { z } from "zod"

import { ContactStatus, ContactType } from "@/generated/prisma/browser"
import { personFields } from "@/lib/schemas/person"

export const CONTACT_TYPES = Object.values(ContactType)
export const CONTACT_STATUSES = Object.values(ContactStatus)

const roleFields = {
  types: z.array(z.enum(ContactType, { error: "Type inconnu" })),
  status: z.enum(ContactStatus, { error: "Statut inconnu" }),
}

// Distinct de `contact.ts` (formulaire public) : ici, le rôle Contact d'une personne du réseau.
export const newContactSchema = z.object({ ...personFields, ...roleFields })

// La personne existe déjà : seul le rôle s'écrit, ses champs n'ont donc pas à être valides ici.
export const attachContactSchema = z.object({
  personId: z.string().trim().min(1),
  ...roleFields,
})

export type NewContactInput = z.infer<typeof newContactSchema>
export type AttachContactInput = z.infer<typeof attachContactSchema>
export type ContactFormFields = NewContactInput & Pick<AttachContactInput, "personId">
