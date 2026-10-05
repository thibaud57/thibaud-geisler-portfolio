import type { ReactNode } from "react"

import { EmptyValue } from "@/components/features/admin/EmptyValue"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { IconComponent } from "@/lib/icons"

// Trois badges au plus puis un « +N », partout en affichage (docs/DESIGN.md § Arbitrages). Une vue
// détail, faite pour tout montrer, passe `max={Infinity}`.
const MAX_VISIBLE = 3

interface Props {
  labels: readonly string[]
  // Complète l'aria-label du « +N » : « Voir les secteurs supplémentaires : … ».
  noun: string
  max?: number
  // Une rangée réservée (rattachements d'une tuile) ne montre rien tant qu'elle est vide.
  empty?: ReactNode
  icons?: Partial<Record<string, IconComponent | null>>
}

export function BadgeList({
  labels,
  noun,
  max = MAX_VISIBLE,
  empty = <EmptyValue />,
  icons,
}: Props) {
  if (labels.length === 0) return empty
  const shown = labels.slice(0, max)
  const hidden = labels.slice(max)

  return (
    <div className="flex flex-wrap gap-1">
      {shown.map((label) => (
        <EnumBadge key={label} label={label} icon={icons?.[label] ?? null} />
      ))}
      {hidden.length > 0 ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="outline" asChild>
              <button
                type="button"
                aria-label={`Voir les ${noun} supplémentaires : ${hidden.join(" · ")}`}
              >
                +{hidden.length}
              </button>
            </Badge>
          </TooltipTrigger>
          <TooltipContent>{labels.join(" · ")}</TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  )
}
