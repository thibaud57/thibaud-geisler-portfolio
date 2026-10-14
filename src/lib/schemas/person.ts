import { z } from "zod"

import { JOB_ROLES } from "@/lib/crm/job-roles"
import { LINKEDIN_PROFILE_ERROR, normalizeLinkedinProfileUrl } from "@/lib/crm/linkedin"
import { notesField, optionalDateField, optionalTextField } from "@/lib/schemas/fields"
import {
  emptyToNull,
  NONE_VALUE,
  nullableEnumField,
  nullifyNoneValue,
} from "@/lib/schemas/none-value"
import { ZONES } from "@/lib/crm/zones"

// Obligatoire à la saisie : il n'est nul que sur une personne opposée, après `optOutPerson`.
const personNameField = z
  .string()
  .trim()
  .min(1, "Le nom est requis")
  .max(120, "Le nom ne peut pas dépasser 120 caractères")

const emailField = z
  .string()
  .trim()
  .toLowerCase()
  .refine((value) => value === "" || z.email().safeParse(value).success, {
    error: "Adresse email invalide",
  })
  .transform(emptyToNull)

const linkedinUrlField = z
  .string()
  .trim()
  .transform((value, ctx) => {
    if (value === "") return null
    const normalized = normalizeLinkedinProfileUrl(value)
    if (normalized === null) {
      ctx.addIssue({ code: "custom", message: LINKEDIN_PROFILE_ERROR })
      return z.NEVER
    }
    return normalized
  })

// Ce qui décrit la personne, jamais son rôle : chaque rôle étend ces champs.
export const personFields = {
  name: personNameField,
  jobRole: nullableEnumField(JOB_ROLES, "Poste inconnu"),
  zone: nullableEnumField(ZONES, "Localité inconnue"),
  email: emailField,
  phone: optionalTextField,
  linkedinUrl: linkedinUrlField,
  metAt: optionalDateField,
  notes: notesField,
  details: optionalTextField,
  companyId: z
    .string()
    .trim()
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
}
