import type { Locale } from "next-intl"

import { isGuardedAssetKey } from "@/lib/asset-keys"

// Route gardée par la session admin : tout le bucket admin s'y lit, logos compris.
export function buildGuardedAssetUrl(key: string): string {
  return `/admin/api/assets/${key}`
}

// URL d'un asset pour la vitrine : la route publique, sauf ce que seule la session peut lire.
export function buildAssetUrl(key: string): string {
  return isGuardedAssetKey(key) ? buildGuardedAssetUrl(key) : `/api/assets/${key}`
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
  // La clé entière aussi : une vue détail envoie sur l'écran Assets avec le chemin complet du
  // fichier, que ni le nom seul ni le dossier seul ne contiennent.
  return (
    key.toLowerCase().includes(normalizedQuery) ||
    nameOfAssetKey(key).toLowerCase().includes(normalizedQuery) ||
    pathOfAssetKey(key).toLowerCase().includes(normalizedQuery)
  )
}

// Référence stable d'un rendu à l'autre : useFacetedSearch mémoïse son filtrage sur ce prédicat,
// qu'une lambda recréée à chaque rendu invaliderait systématiquement.
export const matchesAssetSearch = (asset: { key: string }, query: string): boolean =>
  assetKeyMatchesQuery(asset.key, query)

const CV_FILENAMES = {
  fr: "cv-thibaud-geisler-fr.pdf",
  en: "cv-thibaud-geisler-en.pdf",
} as const satisfies Record<Locale, string>

export const CV_DOWNLOAD_FILENAME = "CV_Thibaud_Geisler.pdf"

export function buildCvUrl(locale: Locale): string {
  return buildAssetUrl(`documents/cv/${CV_FILENAMES[locale]}`)
}
