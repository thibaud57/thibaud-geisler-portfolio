"use client"

import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"

// Colonne d'ouverture de toute liste admin : le nom de l'élément et son slug dessous.
export function NameSlugCell({ name, slug }: { name: string; slug: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <TruncateTooltip className="font-medium">{name}</TruncateTooltip>
      <TruncateTooltip className="font-mono text-xs text-muted-foreground">{slug}</TruncateTooltip>
    </div>
  )
}
