import { z } from "zod"

import { SignalType } from "@/generated/prisma/browser"
import { isoDayToDate } from "@/lib/date-time"
import { isValidWebsiteUrl } from "@/lib/schemas/company"
import { emptyToNull } from "@/lib/schemas/none-value"

export const SIGNAL_CONTENT_MAX_LENGTH = 500
export const SIGNAL_SOURCE_URL_MAX_LENGTH = 2048

export const signalSchema = z.object({
  type: z.enum(SignalType, { error: "Choisissez un type" }),
  occurredOn: z.iso.date({ error: "Choisissez une date" }).transform(isoDayToDate),
  content: z
    .string()
    .trim()
    .min(1, { error: "Décrivez le signal" })
    .max(SIGNAL_CONTENT_MAX_LENGTH, {
      error: `Le contenu ne peut pas dépasser ${SIGNAL_CONTENT_MAX_LENGTH} caractères`,
    }),
  sourceUrl: z
    .string()
    .trim()
    .max(SIGNAL_SOURCE_URL_MAX_LENGTH, {
      error: `Le lien ne peut pas dépasser ${SIGNAL_SOURCE_URL_MAX_LENGTH} caractères`,
    })
    .refine((value) => value === "" || isValidWebsiteUrl(value), {
      error: "L'adresse du lien n'est pas valide",
    })
    .transform(emptyToNull),
})

export type SignalInput = z.infer<typeof signalSchema>
