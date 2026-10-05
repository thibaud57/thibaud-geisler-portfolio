import Link from "next/link"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"

interface Props {
  logoFilename: string | null
  companyName: string
}

// En-tête d'une vue détail : la tuile de la liste, cliquable vers l'écran Assets quand un logo existe.
export function CompanyLogoLink({ logoFilename, companyName }: Props) {
  if (!logoFilename) return <CompanyLogoTile logoFilename={null} />
  return (
    <Link
      href={`/admin/assets?q=${encodeURIComponent(logoFilename)}`}
      aria-label={`Voir le logo de ${companyName} dans les assets`}
      className="group block rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <CompanyLogoTile logoFilename={logoFilename} className="group-hover:border-primary" />
    </Link>
  )
}
