import { z } from "zod"

import { SignalType } from "@/generated/prisma/browser"
import { isValidWebsiteUrl } from "@/lib/schemas/company"
import { emptyToNull } from "@/lib/schemas/none-value"

export const signalSchema = z.object({
  type: z.enum(SignalType, { error: "Choisissez un type" }),
  occurredOn: z.iso
    .date({ error: "Choisissez une date" })
    // Minuit UTC : la colonne date garde ce jour-là, quel que soit le fuseau du navigateur.
    .transform((value) => new Date(`${value}T00:00:00.000Z`)),
  content: z
    .string()
    .trim()
    .min(1, { error: "Décrivez le signal" })
    .max(500, { error: "Le contenu ne peut pas dépasser 500 caractères" }),
  sourceUrl: z
    .string()
    .trim()
    .max(2048, { error: "Le lien ne peut pas dépasser 2048 caractères" })
    .refine((value) => value === "" || isValidWebsiteUrl(value), {
      error: "L'adresse du lien n'est pas valide",
    })
    .transform(emptyToNull),
})

export type SignalInput = z.infer<typeof signalSchema>
