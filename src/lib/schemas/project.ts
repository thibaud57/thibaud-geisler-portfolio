import { z } from "zod"

import {
  ContractStatus,
  ProjectFormat,
  ProjectStatus,
  ProjectType,
  WorkMode,
} from "@/generated/prisma/browser"
import { isProjectAssetKey } from "@/lib/schemas/asset"
import { SLUG_PATTERN } from "@/lib/schemas/slug"

const emptyToNull = (value: unknown) => (value === "" ? null : value)

export const projectSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Le slug est requis")
      .max(80, "Le slug ne peut pas dépasser 80 caractères")
      .regex(
        SLUG_PATTERN,
        "Le slug ne peut contenir que des minuscules, des chiffres et des tirets",
      ),
    titleFr: z
      .string()
      .trim()
      .min(1, "Le titre français est requis")
      .max(120, "Titre français trop long"),
    titleEn: z
      .string()
      .trim()
      .min(1, "Le titre anglais est requis")
      .max(120, "Titre anglais trop long"),
    descriptionFr: z.string().trim().min(1, "La description française est requise"),
    descriptionEn: z.string().trim().min(1, "La description anglaise est requise"),
    type: z.enum(ProjectType, { error: "Le type est requis" }),
    status: z.enum(ProjectStatus, { error: "Le statut est requis" }),
    formats: z
      .array(z.enum(ProjectFormat, { error: "Format inconnu" }))
      .min(1, "Sélectionne au moins un format"),
    startedAt: z.preprocess(emptyToNull, z.coerce.date().nullable()),
    endedAt: z.preprocess(emptyToNull, z.coerce.date().nullable()),
    githubUrl: z.preprocess(
      emptyToNull,
      z.url({ protocol: /^https?$/, error: "L'URL GitHub n'est pas valide" }).nullable(),
    ),
    demoUrl: z.preprocess(
      emptyToNull,
      z.url({ protocol: /^https?$/, error: "L'URL de démonstration n'est pas valide" }).nullable(),
    ),
    coverFilename: z
      .string()
      .trim()
      .refine((value) => value === "" || isProjectAssetKey(value), {
        error: "La couverture doit être choisie dans un dossier de projet de l'espace Assets",
      })
      .transform((value) => (value === "" ? null : value)),
    caseStudyMarkdownFr: z.preprocess(emptyToNull, z.string().nullable()),
    caseStudyMarkdownEn: z.preprocess(emptyToNull, z.string().nullable()),
    // Le contrôle de chaîne précède la coercition : Number('') vaut 0, un champ vidé passerait
    // sinon pour un ordre valide. Même garde sur deliverablesCount.
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
    tagIds: z
      .array(z.string())
      .default([])
      .refine((ids) => new Set(ids).size === ids.length, {
        error: "Un tag ne peut pas être rattaché deux fois",
      }),

    companyId: z.string().trim().min(1, "L'entreprise est requise"),
    workMode: z.enum(WorkMode, { error: "Le mode de travail est requis" }),
    contractStatus: z.preprocess(emptyToNull, z.enum(ContractStatus).nullable()),
    teamSize: z.preprocess(emptyToNull, z.coerce.number().int().min(1).nullable()),
    deliverablesCount: z
      .string()
      .trim()
      .min(1, "Le nombre de livrables est requis")
      .pipe(
        z.coerce
          .number<string>({ error: "Le nombre de livrables doit être un nombre" })
          .int("Le nombre de livrables doit être un entier")
          .min(1, "Le nombre de livrables commence à 1"),
      ),
  })
  .superRefine((data, ctx) => {
    if (data.startedAt && data.endedAt && data.endedAt < data.startedAt) {
      ctx.addIssue({
        code: "custom",
        path: ["endedAt"],
        message: "La date de fin ne peut pas précéder la date de début",
      })
    }
  })

export type ProjectInput = z.infer<typeof projectSchema>

export const projectReorderSchema = z.object({
  orderedIds: z
    .array(z.string().min(1, "Identifiant de projet invalide"))
    .min(1, "La liste des projets est requise")
    .refine((ids) => new Set(ids).size === ids.length, {
      error: "La liste des projets ne peut pas contenir de doublon",
    }),
})
