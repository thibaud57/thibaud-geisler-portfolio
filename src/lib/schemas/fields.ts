import { z } from "zod"

import { emptyToNull } from "@/lib/schemas/none-value"

export const NOTES_MAX_LENGTH = 200

export const optionalTextField = z.string().trim().transform(emptyToNull)

// Ligne courte de marqueurs, même règle et même message partout.
export const notesField = z
  .string()
  .trim()
  .max(
    NOTES_MAX_LENGTH,
    `Les notes tiennent sur une ligne (${NOTES_MAX_LENGTH} caractères au plus)`,
  )
  .transform(emptyToNull)

export const optionalDateField = z.preprocess(
  (value) => (value === "" ? null : value),
  z.coerce.date({ error: "Date invalide" }).nullable(),
)

export function optionalInt(min: number, max: number, message: string) {
  return z
    .string()
    .trim()
    .refine(
      (value) =>
        value === "" || (/^\d+$/.test(value) && Number(value) >= min && Number(value) <= max),
      { error: message },
    )
    .transform((value) => (value === "" ? null : Number(value)))
}
