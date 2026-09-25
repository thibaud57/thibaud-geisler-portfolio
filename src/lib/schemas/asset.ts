import { z } from "zod"

import { ALLOWED_EXTENSIONS, ASSET_EXTENSION_ERROR_MESSAGE } from "@/lib/asset-content-types"
import { ASSET_FOLDERS, folderNeedsSlug } from "@/lib/asset-keys"
import { SLUG_PATTERN } from "@/lib/schemas/slug"

const FILENAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/

export const assetUploadSchema = z
  .object({
    folder: z.enum(ASSET_FOLDERS, { error: "Dossier de destination invalide" }),
    slug: z.string().trim().toLowerCase().optional(),
    filename: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, "Le nom du fichier est requis")
      .regex(
        FILENAME_PATTERN,
        "Le nom ne peut contenir que des minuscules, chiffres, points, tirets et underscores",
      )
      .refine((value) => ALLOWED_EXTENSIONS.includes(value.split(".").pop() ?? ""), {
        message: ASSET_EXTENSION_ERROR_MESSAGE,
      }),
  })
  .superRefine((data, ctx) => {
    const needsSlug = folderNeedsSlug(data.folder)

    if (needsSlug && !data.slug) {
      ctx.addIssue({
        code: "custom",
        path: ["slug"],
        message: "Ce dossier attend un sous-dossier de destination",
      })
      return
    }
    if (needsSlug && data.slug && !SLUG_PATTERN.test(data.slug)) {
      ctx.addIssue({
        code: "custom",
        path: ["slug"],
        message: "Slug invalide : minuscules, chiffres et tirets uniquement",
      })
    }
    if (!needsSlug && data.slug) {
      ctx.addIssue({
        code: "custom",
        path: ["slug"],
        message: "Ce dossier n'accepte pas de sous-dossier",
      })
    }
  })

export type AssetUploadInput = z.infer<typeof assetUploadSchema>
