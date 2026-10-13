import type { ReactNode } from "react"

export interface LinkMarker {
  icon: ReactNode
  emphasized?: boolean
}

export interface RelatedLink {
  id: string
  href?: string
  // Une fonction ne traverse pas la frontière serveur/client : seul un appelant client peut en définir une.
  onClick?: () => void
  label: string
  meta?: string
  trailing?: string
  actions?: ReactNode
  at?: Date
  marker?: LinkMarker
}
