"use client"

import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"

export function NameSlugCell({ name, slug }: { name: string; slug: string }) {
  return (
    <div className="flex min-w-0 flex-col">
      <TruncateTooltip className="font-medium">{name}</TruncateTooltip>
      <TruncateTooltip className="font-mono text-xs text-muted-foreground">{slug}</TruncateTooltip>
    </div>
  )
}
