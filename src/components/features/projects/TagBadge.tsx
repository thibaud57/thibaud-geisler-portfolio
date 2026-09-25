import { Badge } from "@/components/ui/badge"
import { TagIcon } from "@/lib/icons"
import type { LocalizedTagRecord } from "@/types/project"

interface Props {
  tag: Pick<LocalizedTagRecord, "name" | "icon">
  className?: string
}

export function TagBadge({ tag, className }: Props) {
  return (
    <Badge variant="secondary" className={className}>
      <TagIcon icon={tag.icon} className="shrink-0" />
      <span>{tag.name}</span>
    </Badge>
  )
}
