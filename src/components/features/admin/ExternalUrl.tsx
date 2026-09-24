import type { ReactNode } from "react"

import { STANDALONE_LINK_CLASS } from "@/lib/typography"
import { safeExternalUrl } from "@/lib/url"
import { cn } from "@/lib/utils"

interface Props {
  url: string | null
  // Le texte du lien : l'adresse elle-même par défaut, un nom court (« GitHub ») en colonne.
  children?: ReactNode
  className?: string
}

// null si absente ou refusée par safeExternalUrl : le conteneur affiche alors son propre tiret.
export function ExternalUrl({ url, children, className }: Props) {
  const href = safeExternalUrl(url)
  if (!href) return null
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(STANDALONE_LINK_CLASS, className)}
    >
      {children ?? href}
    </a>
  )
}
