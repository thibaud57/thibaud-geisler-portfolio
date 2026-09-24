"use client"

import Link from "next/link"

import { AssetPreview } from "@/components/features/admin/assets/AssetPreview"

// Couverture ou logo d'une vue détail : un clic mène vers l'écran Assets, la recherche déjà posée
// sur ce fichier. Le lien colle à la tuile, sans fond : au survol, seule la vignette prend la
// bordure primaire.
export function AssetPreviewLink({ assetKey }: { assetKey: string }) {
  return (
    <Link
      href={`/admin/assets?q=${encodeURIComponent(assetKey)}`}
      className="group inline-flex max-w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <AssetPreview assetKey={assetKey} sizes="112px" row />
    </Link>
  )
}
