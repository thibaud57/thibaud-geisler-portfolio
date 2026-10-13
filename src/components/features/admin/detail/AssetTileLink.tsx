import Link from "next/link"

import { CompanyLogoTile } from "@/components/features/admin/display/CompanyLogoTile"

interface Props {
  assetKey: string | null
  name: string
}

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
