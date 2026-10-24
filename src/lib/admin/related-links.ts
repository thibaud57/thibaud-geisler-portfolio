import type { Route } from "next"
import type { ReactNode } from "react"

export interface LinkMarker {
  icon: ReactNode
  emphasized?: boolean
}

// `Route` seul refuse les routes dynamiques : les fiches de modification d'un lead, d'une opportunité ou d'un entretien se déclarent à part.
export type RelatedHref =
  Route | Route<`${"/admin/leads" | "/admin/opportunites" | "/admin/entretiens"}/${string}`>

interface RelatedLinkBase {
  id: string
  label: string
  meta?: string
  trailing?: string
  actions?: ReactNode
  at?: Date
  marker?: LinkMarker
}

// Une fonction ne traverse pas la frontière serveur/client : seul un appelant client peut définir `onClick`.
export type RelatedLink = RelatedLinkBase &
  ({ href: RelatedHref; onClick?: () => void } | { href?: never; onClick?: () => void })
