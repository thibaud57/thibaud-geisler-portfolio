import { type DetailRow } from "@/components/features/admin/detail/DetailDialog"
import { TruncateTooltip } from "@/components/features/admin/display/TruncateTooltip"
import { TagIcon } from "@/lib/icons"
import { TAG_FIELD_LABELS } from "@/lib/tags"
import type { AdminTag } from "@/server/queries/tags"

export function renderTagIcon(icon: string | null) {
  if (!icon) return null
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
      <TagIcon icon={icon} className="size-4" />
      <TruncateTooltip className="font-mono text-xs">{icon}</TruncateTooltip>
    </span>
  )
}

export function tagDetailRows(tag: AdminTag): readonly DetailRow[] {
  return [
    { label: TAG_FIELD_LABELS.nameEn, value: tag.nameEn },
    { label: TAG_FIELD_LABELS.displayOrder, value: String(tag.displayOrder) },
    { label: TAG_FIELD_LABELS.icon, value: renderTagIcon(tag.icon) },
    {
      label: TAG_FIELD_LABELS.projects,
      value: `${tag._count.projects} projet${tag._count.projects > 1 ? "s" : ""}`,
    },
  ]
}
