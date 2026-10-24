"use client"

import Link from "next/link"

import type { LinkMarker, RelatedLink } from "@/lib/admin/related-links"
import { TruncateTooltip } from "@/components/features/admin/display/TruncateTooltip"
import { cn } from "@/lib/utils"

interface Props {
  link: RelatedLink
}

export function RelatedLinkRow({ link }: Props) {
  const { href, onClick } = link

  return (
    <li className="relative flex min-w-0 items-center gap-2 py-1.5 pl-8 text-sm">
      <TimelineMarker marker={link.marker} />
      <TruncateTooltip className={cn("min-w-0 font-medium", link.meta && "max-w-[60%]")}>
        {href ? (
          <Link
            href={href}
            onClick={
              onClick
                ? (event) => {
                    event.preventDefault()
                    onClick()
                  }
                : undefined
            }
            className="underline-offset-4 hover:underline"
          >
            {link.label}
          </Link>
        ) : onClick ? (
          <button type="button" onClick={onClick} className="underline-offset-4 hover:underline">
            {link.label}
          </button>
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
