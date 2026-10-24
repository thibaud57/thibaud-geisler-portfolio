import { z } from "zod"

import { ASSET_EXTENSION_ERROR_MESSAGE, isAllowedExtension } from "@/lib/asset-content-types"
import { FOLDERS_WITH_SLUG, FOLDERS_WITHOUT_SLUG } from "@/lib/asset-keys"
import { SLUG_PATTERN } from "@/lib/schemas/slug"

const FILENAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/

const folderError = "Dossier de destination invalide"

const filenameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Le nom du fichier est requis")
  .regex(
    FILENAME_PATTERN,
    "Le nom ne peut contenir que des minuscules, chiffres, points, tirets et underscores",
  )
  .refine((value) => isAllowedExtension(value.split(".").pop() ?? ""), {
    message: ASSET_EXTENSION_ERROR_MESSAGE,
  })

const missingSlugError = "Ce dossier attend un sous-dossier de destination"

export const assetUploadSchema = z.discriminatedUnion(
  "folder",
  [
    z.object({
      folder: z.enum(FOLDERS_WITH_SLUG, { error: folderError }),
      slug: z
        .string({ error: missingSlugError })
        .trim()
        .toLowerCase()
        .min(1, missingSlugError)
        .regex(SLUG_PATTERN, "Slug invalide : minuscules, chiffres et tirets uniquement"),
      filename: filenameSchema,
    }),
    z.object({
      folder: z.enum(FOLDERS_WITHOUT_SLUG, { error: folderError }),
      // Le formulaire envoie toujours un champ slug, vide pour ces dossiers.
      slug: z
        .string()
        .trim()
        .max(0, "Ce dossier n'accepte pas de sous-dossier")
        .optional()
        .transform((): undefined => undefined),
      filename: filenameSchema,
    }),
  ],
  { error: folderError },
)

export type AssetUploadInput = z.infer<typeof assetUploadSchema>
