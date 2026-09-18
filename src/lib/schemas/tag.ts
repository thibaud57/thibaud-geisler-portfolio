import { z } from "zod"

import { TagKind } from "@/generated/prisma/browser"
import { TAG_ICON_KEYS } from "@/lib/icons"

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const tagSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Le slug est requis")
    .max(60, "Le slug ne peut pas dépasser 60 caractères")
    .regex(SLUG_PATTERN, "Le slug ne peut contenir que des minuscules, des chiffres et des tirets"),
  nameFr: z
    .string()
    .trim()
    .min(1, "Le nom français est requis")
    .max(60, "Le nom français ne peut pas dépasser 60 caractères"),
  nameEn: z
    .string()
    .trim()
    .min(1, "Le nom anglais est requis")
    .max(60, "Le nom anglais ne peut pas dépasser 60 caractères"),
  kind: z.enum(TagKind, { error: "La catégorie est requise" }),
  icon: z
    .string()
    .trim()
    .refine((value) => value === "" || TAG_ICON_KEYS.includes(value), {
      error: "Cette icône n'existe pas dans le registre",
    })
    .optional()
    .transform((value) => (value === "" || value === undefined ? null : value)),
  // Le contrôle de chaîne précède la coercition : Number("") vaut 0, un champ vidé passerait
  // sinon pour un ordre valide.
  displayOrder: z
    .string()
    .trim()
    .min(1, "L'ordre est requis")
    .pipe(
      z.coerce
        .number<string>({ error: "L'ordre doit être un nombre" })
        .int("L'ordre doit être un entier")
        .min(1, "L'ordre commence à 1"),
    ),
})

export type TagInput = z.infer<typeof tagSchema>

export const tagReorderSchema = z.object({
  kind: z.enum(TagKind, { error: "La catégorie est requise" }),
  orderedIds: z
    .array(z.string().min(1, "Identifiant de tag invalide"))
    .min(1, "La liste des tags est requise")
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "La liste des tags ne peut pas contenir de doublon",
    }),
})
