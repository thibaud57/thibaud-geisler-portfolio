import Link from "next/link"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"

interface Props {
  assetKey: string | null
  name: string
}

// Image d'identité dans l'en-tête d'une vue détail (logo, couverture) : la tuile en grand, cliquable vers l'écran Assets quand le fichier existe.
export function AssetTileLink({ assetKey, name }: Props) {
  if (!assetKey) return <CompanyLogoTile logoFilename={null} size="lg" />
  return (
    <Link
      href={`/admin/assets?q=${encodeURIComponent(assetKey)}`}
      aria-label={`Voir l'image de ${name} dans les assets`}
      className="group block rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CompanyLogoTile logoFilename={assetKey} size="lg" className="group-hover:border-primary" />
    </Link>
  )
}
