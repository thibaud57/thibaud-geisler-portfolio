import type { Locale } from "next-intl"

import { isAdminAssetKey } from "@/lib/schemas/asset"

export function buildAssetUrl(key: string): string {
  const base = isAdminAssetKey(key) ? "/admin/api/assets" : "/api/assets"
  return `${base}/${key}`
}

export function nameOfAssetKey(key: string): string {
  return key.split("/").at(-1) ?? key
}

export function pathOfAssetKey(key: string): string {
  return key.split("/").slice(0, -1).join("/")
}

// Dernier segment du dossier : sur les clés profondes (freelance/crm/entreprises/<slug>/logo.png),
// c'est lui qui distingue deux fichiers de même nom, quand le début du chemin est commun à tous et
// se ferait tronquer en premier.
export function folderLabelOfAssetKey(key: string): string {
  return pathOfAssetKey(key).split("/").at(-1) ?? ""
}

export function isPdfAssetKey(key: string): boolean {
  return key.toLowerCase().endsWith(".pdf")
}

export function assetKeyMatchesQuery(key: string, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return true
  return (
    nameOfAssetKey(key).toLowerCase().includes(normalizedQuery) ||
    pathOfAssetKey(key).toLowerCase().includes(normalizedQuery)
  )
}

const CV_FILENAMES = {
  fr: "cv-thibaud-geisler-fr.pdf",
  en: "cv-thibaud-geisler-en.pdf",
} as const satisfies Record<Locale, string>

export const CV_DOWNLOAD_FILENAME = "CV_Thibaud_Geisler.pdf"

export function buildCvUrl(locale: Locale): string {
  return buildAssetUrl(`documents/cv/${CV_FILENAMES[locale]}`)
}
