"use client"

import type { Route } from "next"
import Link from "next/link"

import type { LinkMarker, RelatedLink } from "@/components/features/admin/detail/RelatedLinksList"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { cn } from "@/lib/utils"

interface Props {
  link: RelatedLink
}

export function RelatedLinkRow({ link }: Props) {
  const clickable = Boolean(link.href) || Boolean(link.onClick)

  return (
    <li className="relative flex min-w-0 items-center gap-2 py-1.5 pl-8 text-sm">
      <TimelineMarker marker={link.marker} />
      <TruncateTooltip className={cn("min-w-0 font-medium", link.meta && "max-w-[60%]")}>
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
            className="underline-offset-4 hover:underline"
          >
            {link.label}
          </Link>
        ) : (
          link.label
        )}
      </TruncateTooltip>
      {link.meta ? (
        <>
          <span aria-hidden="true" className="shrink-0 text-muted-foreground">
            :
          </span>
          <TruncateTooltip className="min-w-0 flex-1 text-muted-foreground">
            {link.meta}
          </TruncateTooltip>
        </>
      ) : null}
      {link.trailing || link.actions ? (
        <span className="ml-auto flex shrink-0 items-center gap-2">
          {link.trailing ? (
            <span className="text-xs whitespace-nowrap text-muted-foreground tabular-nums">
              {link.trailing}
            </span>
          ) : null}
          {link.actions ? <span className="inline-flex">{link.actions}</span> : null}
        </span>
      ) : null}
    </li>
  )
}

function TimelineMarker({ marker }: { marker: LinkMarker | undefined }) {
  return (
    // `bg-card` et non `bg-background` : la card et la modale partagent cette teinte, `background` fait un disque plus sombre en thème sombre.
    <span
      aria-hidden="true"
      className={cn(
        "absolute top-1/2 left-0 flex size-5 -translate-y-1/2 items-center justify-center rounded-full border bg-card [&>svg]:size-3.5",
        marker?.emphasized ? "border-foreground/40 text-foreground" : "text-muted-foreground",
      )}
    >
      {marker?.icon ?? <span className="size-1.5 rounded-full bg-current" />}
    </span>
  )
}
