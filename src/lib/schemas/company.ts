import { z } from "zod"

import {
  CompanySector,
  CompanySize,
  CompanyType,
  RelationStatus,
  Zone,
} from "@/generated/prisma/browser"
import { isCompanyLogoKey } from "@/lib/asset-keys"
import { notesField, optionalTextField } from "@/lib/schemas/fields"
import { legalEntityFields, refineLegalEntity } from "@/lib/schemas/legal-entity"
import { emptyToNull, NONE_VALUE, nullifyNoneValue } from "@/lib/schemas/none-value"
import { SLUG_PATTERN } from "@/lib/schemas/slug"
import { sortZones } from "@/lib/crm/zones"

export const COMPANY_SECTORS = Object.values(CompanySector)
export const COMPANY_SIZES = Object.values(CompanySize)
export const COMPANY_TYPES = Object.values(CompanyType)
export const RELATION_STATUSES = Object.values(RelationStatus)

export const websiteUrlSchema = z
  .string()
  .trim()
  .pipe(z.url({ protocol: /^https?$/ }))

export const isValidWebsiteUrl = (value: string): boolean =>
  websiteUrlSchema.safeParse(value).success

export const companySchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Le slug est requis")
      .max(60, "Le slug ne peut pas dépasser 60 caractères")
      .regex(
        SLUG_PATTERN,
        "Le slug ne peut contenir que des minuscules, des chiffres et des tirets",
      ),
    name: z
      .string()
      .trim()
      .min(1, "Le nom est requis")
      .max(120, "Le nom ne peut pas dépasser 120 caractères"),
    sectors: z.array(z.enum(CompanySector, { error: "Secteur inconnu" })),
    size: z
      .union([z.enum(CompanySize), z.literal(NONE_VALUE), z.literal("")], {
        error: "Taille inconnue",
      })
      .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
    websiteUrl: z
      // Zod 4 remonte le message de z.url() plutôt que l'`error` du z.union parent : un refine sur z.string() garde un seul message.
      .string()
      .trim()
      .refine((value) => value === "" || isValidWebsiteUrl(value), {
        error: "L'adresse du site n'est pas valide",
      })
      .transform(emptyToNull),
    logoFilename: z
      .string()
      .trim()
      .refine((value) => value === "" || isCompanyLogoKey(value), {
        error: "Le logo doit être choisi dans l'espace Assets",
      })
      .transform(emptyToNull),
    types: z
      .array(z.enum(CompanyType, { error: "Type inconnu" }))
      .min(1, "Sélectionne au moins un type")
      .optional(),
    relationStatus: z.enum(RelationStatus, { error: "Statut de relation inconnu" }).optional(),
    zones: z
      .array(z.enum(Zone, { error: "Localité inconnue" }))
      .transform((value) => sortZones(value))
      .optional(),
    notes: notesField.optional(),
    details: optionalTextField.optional(),
    ...legalEntityFields,
  })
  .superRefine(refineLegalEntity)

export type CompanyInput = z.infer<typeof companySchema>
