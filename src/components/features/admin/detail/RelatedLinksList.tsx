"use client"

import { ChevronDown, ChevronUp } from "lucide-react"
import { useId, useRef, useState, type ReactNode } from "react"
import { flushSync } from "react-dom"

import { RelatedLinkRow } from "@/components/features/admin/detail/RelatedLinkRow"
import { Button } from "@/components/ui/button"
import { formatMonthYear } from "@/lib/date-time"
import { LABEL_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"

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

interface Props {
  links: readonly RelatedLink[]
}

const PAGE_SIZE = 5

// Une fiche sans date passe après les fiches datées, sans en-tête de mois ; `toSorted` est stable.
function newestFirst(a: RelatedLink, b: RelatedLink): number {
  return (b.at?.getTime() ?? 0) - (a.at?.getTime() ?? 0)
}

function groupByMonth(links: readonly RelatedLink[]) {
  const groups: { label: string | null; links: RelatedLink[] }[] = []
  for (const link of links) {
    const label = link.at ? formatMonthYear(link.at) : null
    const last = groups.at(-1)
    if (last?.label === label) last.links.push(link)
    else groups.push({ label, links: [link] })
  }
  return groups
}

export function RelatedLinksList({ links }: Props) {
  const listId = useId()
  const moreRef = useRef<HTMLButtonElement>(null)
  const lessRef = useRef<HTMLButtonElement>(null)
  const anchor = links[0]?.id
  const [expansion, setExpansion] = useState({ anchor, visible: PAGE_SIZE })
  // Une autre fiche ouverte dans la même modale réutilise ce composant : sans ancre, elle
  // hériterait du dépli de la précédente.
  if (expansion.anchor !== anchor) setExpansion({ anchor, visible: PAGE_SIZE })

  const visible = Math.min(expansion.visible, links.length)
  const remaining = links.length - visible
  const groups = groupByMonth(links.toSorted(newestFirst).slice(0, visible))

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div
        id={listId}
        // Le trait passe au centre des marqueurs `left-0 size-5` de `RelatedLinkRow` : les deux se déplacent ensemble.
        className="relative flex flex-col gap-3 before:absolute before:inset-y-2 before:left-2.5 before:w-px before:bg-border"
      >
        {groups.map((group) => (
          <div key={group.label ?? ""} className="flex flex-col gap-1">
            {group.label ? (
              <h4 className={cn(LABEL_CLASS, "pl-8 text-xs")}>{group.label}</h4>
            ) : null}
            <ul className="flex flex-col">
              {group.links.map((link) => (
                <RelatedLinkRow key={link.id} link={link} />
              ))}
            </ul>
          </div>
        ))}
      </div>
      {links.length > PAGE_SIZE ? (
        <div className="-ml-2.5 flex items-center gap-1">
          {remaining > 0 ? (
            <Button
              ref={moreRef}
              type="button"
              variant="ghost"
              size="sm"
              aria-controls={listId}
              onClick={() => {
                const next = visible + PAGE_SIZE
                // Le bouton cliqué disparaît au bout de la liste : sans relais, le focus retomberait sur le body.
                flushSync(() => {
                  setExpansion({ anchor, visible: next })
                })
                if (next >= links.length) lessRef.current?.focus()
              }}
            >
              Voir plus ({remaining} {remaining > 1 ? "restants" : "restant"})
              <ChevronDown aria-hidden data-icon="inline-end" />
            </Button>
          ) : null}
          {visible > PAGE_SIZE ? (
            <Button
              ref={lessRef}
              type="button"
              variant="ghost"
              size="sm"
              aria-controls={listId}
              onClick={() => {
                flushSync(() => {
                  setExpansion({ anchor, visible: PAGE_SIZE })
                })
                moreRef.current?.focus()
              }}
            >
              Voir moins
              <ChevronUp aria-hidden data-icon="inline-end" />
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
