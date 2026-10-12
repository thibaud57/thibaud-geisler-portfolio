import type { Route } from "next"
import Link from "next/link"
import type { ReactNode } from "react"

import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { cn } from "@/lib/utils"

export interface RelatedLink {
  id: string
  href?: string
  // Une fonction ne traverse pas la frontière serveur/client : ce fichier n'est pas `use client`, seul un appelant client peut en définir une.
  onClick?: () => void
  label: string
  meta?: string
  trailing?: string
  actions?: ReactNode
}

interface Props {
  links: readonly RelatedLink[]
}

const LABEL_CLASS = "max-w-full shrink-0 truncate font-medium"

export function RelatedLinksList({ links }: Props) {
  return (
    <ul className="flex flex-col gap-2">
      {links.map((link) => {
        const clickable = Boolean(link.href) || Boolean(link.onClick)
        return (
          <li key={link.id} className="flex min-w-0 flex-col gap-0.5 text-sm">
            <span className="flex min-w-0 items-baseline gap-2">
              {clickable ? (
                <Link
                  // `href` est un `string` : typedRoutes ne vérifie plus la route d'aucun appelant, le cast ne fait que contenter `Link`.
                  href={(link.href as Route | undefined) ?? "#"}
                  onClick={
                    link.onClick
                      ? (event) => {
                          event.preventDefault()
                          link.onClick?.()
                        }
                      : undefined
                  }
                  className={cn(LABEL_CLASS, "underline-offset-4 hover:underline")}
                >
                  {link.label}
                </Link>
              ) : (
                <span className={LABEL_CLASS}>{link.label}</span>
              )}
              {link.meta ? (
                <>
                  <span aria-hidden="true" className="shrink-0 text-muted-foreground">
                    :
                  </span>
                  <TruncateTooltip className="min-w-0 flex-auto text-muted-foreground">
                    {link.meta}
                  </TruncateTooltip>
                </>
              ) : null}
              {link.actions ? (
                <span className="ml-auto inline-flex shrink-0 self-center">{link.actions}</span>
              ) : null}
            </span>
            {link.trailing ? (
              <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
                {link.trailing}
              </span>
            ) : null}
          </li>
        )
      })}
    </ul>
  )
}
