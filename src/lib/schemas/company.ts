import { z } from "zod"

import { isCompanyLogoKey } from "@/lib/schemas/asset"
import { nullifyNoneValue } from "@/lib/schemas/none-value"
import { SLUG_PATTERN } from "@/lib/schemas/slug"

const SECTORS = [
  "ASSURANCE",
  "FINTECH",
  "SAAS",
  "SERVICES_RH",
  "ESN_CONSEIL",
  "LOGICIELS_ENTREPRISE",
  "ECOMMERCE",
  "IA_AUTOMATISATION",
  "EMARKETING",
  "BANQUE",
  "AUTRE",
] as const

export const COMPANY_SECTORS = SECTORS
export const COMPANY_SIZES = ["TPE", "PME", "ETI", "GROUPE"] as const

const WEBSITE_URL_SCHEMA = z.url({ protocol: /^https?$/ })

export const NONE_VALUE = "aucune"

export const companySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Le slug est requis")
    .max(60, "Le slug ne peut pas dépasser 60 caractères")
    .regex(SLUG_PATTERN, "Le slug ne peut contenir que des minuscules, des chiffres et des tirets"),
  name: z
    .string()
    .trim()
    .min(1, "Le nom est requis")
    .max(120, "Le nom ne peut pas dépasser 120 caractères"),
  sectors: z
    .array(z.enum(SECTORS, { error: "Secteur inconnu" }))
    .min(1, "Sélectionne au moins un secteur"),
  size: z
    .union([z.enum(COMPANY_SIZES), z.literal(NONE_VALUE), z.literal("")], {
      error: "Taille inconnue",
    })
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  websiteUrl: z
    // Zod 4 fait remonter le message de z.url() en échec plutôt que l'`error` du z.union parent :
    // un refine sur z.string() garde un seul message, quel que soit le point d'échec.
    .string()
    .trim()
    .refine((value) => value === "" || WEBSITE_URL_SCHEMA.safeParse(value).success, {
      error: "L'adresse du site n'est pas valide",
    })
    .transform((value) => (value === "" ? null : value)),
  legalEntityId: z
    .string()
    .trim()
    .transform((value) => nullifyNoneValue(value, NONE_VALUE)),
  logoFilename: z
    .string()
    .trim()
    .refine((value) => value === "" || isCompanyLogoKey(value), {
      error: "Le logo doit être choisi dans l'espace Assets",
    })
    .transform((value) => (value === "" ? null : value)),
})

export type CompanyInput = z.infer<typeof companySchema>
