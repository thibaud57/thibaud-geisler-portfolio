import type { ReactNode } from "react"

import { TruncateTooltip } from "@/components/features/admin/display/TruncateTooltip"
import { cn } from "@/lib/utils"

interface Props {
  title: string
  subtitle?: string | null
  // Un slug se lit en mono, comme dans son champ ; une entreprise reste du texte.
  mono?: boolean
  leading?: ReactNode
}

export function TitleCell({ title, subtitle, mono = false, leading }: Props) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      {leading}
      <div className="flex min-w-0 flex-col">
        <TruncateTooltip className="font-medium">{title}</TruncateTooltip>
        {subtitle ? (
          <TruncateTooltip className={cn("text-xs", mono && "font-mono", "text-muted-foreground")}>
            {subtitle}
          </TruncateTooltip>
        ) : null}
      </div>
    </div>
  )
}
