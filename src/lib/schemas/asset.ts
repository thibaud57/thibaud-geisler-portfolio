import { z } from "zod"

import { ALLOWED_EXTENSIONS, ASSET_EXTENSION_ERROR_MESSAGE } from "@/lib/asset-content-types"
import { SLUG_PATTERN } from "@/lib/schemas/slug"

// Miroir du schema `freelance` (ADR-011) : une clé qui y commence vit sur portfolio-admin.
export function isAdminAssetKey(key: string): boolean {
  return key.startsWith("freelance/")
}

export const COMPANY_LOGO_FOLDER = "freelance/crm/entreprises"

// Seule exception du bucket admin : le logo d'une entreprise s'affiche sur la vitrine, la route
// publique le sert donc sans session, tout en le laissant dans le bucket du CRM.
export function isCompanyLogoKey(key: string): boolean {
  return key.startsWith(`${COMPANY_LOGO_FOLDER}/`)
}

// Servie par la route gardée /admin/api/assets : tout portfolio-admin, moins l'exception ci-dessus.
export function isGuardedAssetKey(key: string): boolean {
  return isAdminAssetKey(key) && !isCompanyLogoKey(key)
}

const PROJECT_FOLDERS = ["projets/client", "projets/personal"] as const

export function isProjectAssetKey(key: string): boolean {
  return PROJECT_FOLDERS.some((folder) => key.startsWith(`${folder}/`))
}

export const MAX_ASSET_BYTES = 8 * 1024 * 1024

// Arborescence ADR-011, deux buckets :
//   branding/<fichier>                              → logos et portrait (portfolio-assets)
//   documents/cv/<fichier>                          → CV par locale (portfolio-assets)
//   projets/{client,personal}/<slug>/<fichier>      → couvertures et captures de projets (portfolio-assets)
//   freelance/crm/entreprises/<slug>/<fichier>      → logo d'entreprise (portfolio-admin, lu aussi par la vitrine)
export const FOLDERS_WITH_SLUG = [
  "projets/client",
  "projets/personal",
  COMPANY_LOGO_FOLDER,
] as const
export const FOLDERS_WITHOUT_SLUG = ["branding", "documents/cv"] as const
export const ASSET_FOLDERS = [...FOLDERS_WITH_SLUG, ...FOLDERS_WITHOUT_SLUG] as const

export function folderNeedsSlug(folder: string): boolean {
  return (FOLDERS_WITH_SLUG as readonly string[]).includes(folder)
}

// Ces dossiers ne vivent dans aucune colonne : leur chemin est écrit en dur dans le code du site
// (logo navbar, portrait à propos, JSON-LD, liens de CV), donc rien ne peut vérifier leur usage.
export function isHardcodedAssetKey(key: string): boolean {
  return (FOLDERS_WITHOUT_SLUG as readonly string[]).some((folder) => key.startsWith(`${folder}/`))
}

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

export function buildAssetKey(input: AssetUploadInput): string {
  return input.slug
    ? `${input.folder}/${input.slug}/${input.filename}`
    : `${input.folder}/${input.filename}`
}
