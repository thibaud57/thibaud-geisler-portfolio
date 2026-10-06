import { z } from "zod"

import { CAPITAL_CURRENCIES, LEGAL_FORMS, VAT_REGIMES } from "@/lib/legal-entities"
import {
  emptyToNull,
  NONE_VALUE,
  nullableEnumField,
  nullifyNoneValue,
} from "@/lib/schemas/none-value"

const optionalText = z.string().trim().transform(emptyToNull).optional()

const nullableEnum = <T extends string>(values: readonly T[], error: string) =>
  nullableEnumField(values, error).optional()

export const legalEntityFields = {
  legalEntityName: z
    .string()
    .trim()
    .max(160, "La raison sociale ne peut pas dépasser 160 caractères")
    .optional(),
  legalEntityStatusKey: nullableEnum(LEGAL_FORMS, "Forme juridique inconnue"),
  legalEntitySiret: z
    .string()
    .transform((value) => value.replace(/\s/g, ""))
    .refine((value) => value === "" || /^\d{14}$/.test(value), {
      error: "Le SIRET compte 14 chiffres",
    })
    .transform(emptyToNull)
    .optional(),
  legalEntityVatNumber: z
    .string()
    .transform((value) => value.replace(/\s/g, "").toUpperCase())
    .refine((value) => value === "" || /^[A-Z]{2}[A-Z0-9]{8,12}$/.test(value), {
      error: "Le numéro de TVA commence par deux lettres, suivies de 8 à 12 caractères",
    })
    .transform(emptyToNull)
    .optional(),
  // Les champs de TVA appartiennent au Publisher, ils ne comptent jamais comme une valeur de l'entité.
  legalEntityVatLiableSince: z
    .preprocess(
      (value) => (value === "" ? null : value),
      z.coerce.date({ error: "Date invalide" }).nullable(),
    )
    .optional(),
  legalEntityVatRegime: nullableEnum(VAT_REGIMES, "Régime de TVA inconnu"),
  legalEntityRcsCity: optionalText,
  legalEntityRcsNumber: optionalText,
  legalEntityPhone: optionalText,
  legalEntityCapitalAmount: z
    .string()
    .trim()
    .refine((value) => value === "" || /^\d+$/.test(value), {
      error: "Le capital est un nombre entier",
    })
    .transform((value) => (value === "" ? null : Number(value)))
    .optional(),
  legalEntityCapitalCurrency: nullableEnum(CAPITAL_CURRENCIES, "Devise inconnue"),
  legalEntityStreet: optionalText,
  legalEntityPostalCode: optionalText,
  legalEntityCity: optionalText,
  legalEntityCountry: z
    .string()
    .trim()
    .transform((value) => nullifyNoneValue(value, NONE_VALUE))
    .refine((value) => value === null || /^[A-Z]{2}$/.test(value), { error: "Pays inconnu" })
    .optional(),
}

type LegalEntityValues = z.output<z.ZodObject<typeof legalEntityFields>>

const ADDRESS_FIELDS = [
  "legalEntityStreet",
  "legalEntityPostalCode",
  "legalEntityCity",
  "legalEntityCountry",
] as const

// La devise (toujours un défaut non vide) et les champs de TVA (propres au Publisher) ne comptent pas.
const ENTITY_FIELDS = [
  "legalEntityName",
  ...ADDRESS_FIELDS,
  "legalEntityStatusKey",
  "legalEntitySiret",
  "legalEntityVatNumber",
  "legalEntityRcsCity",
  "legalEntityRcsNumber",
  "legalEntityPhone",
  "legalEntityCapitalAmount",
] as const

// Un capital de 0 est une valeur : un test de véracité le ferait passer pour vide.
function isFilled(value: unknown): boolean {
  return value !== null && value !== undefined && value !== ""
}

export function refineLegalEntity(data: LegalEntityValues, ctx: z.RefinementCtx): void {
  const issue = (path: keyof LegalEntityValues, message: string) => {
    ctx.addIssue({ code: "custom", path: [path], message })
  }

  if (ENTITY_FIELDS.some((field) => isFilled(data[field]))) {
    if (!data.legalEntityName) issue("legalEntityName", "La raison sociale est requise")
    for (const field of ADDRESS_FIELDS) {
      if (!data[field]) issue(field, "Requis pour un siège complet")
    }
  }

  // La date et le régime vont ensemble : le numéro de TVA motive l'assujettissement.
  if (data.legalEntityVatLiableSince && !data.legalEntityVatRegime) {
    issue("legalEntityVatRegime", "Choisissez le régime")
  }
  if (data.legalEntityVatRegime && !data.legalEntityVatLiableSince) {
    issue("legalEntityVatLiableSince", "La date d'assujettissement est requise")
  }
  if (data.legalEntityVatLiableSince && data.legalEntityVatRegime && !data.legalEntityVatNumber) {
    issue("legalEntityVatNumber", "Le numéro de TVA est requis une fois assujetti")
  }
}
