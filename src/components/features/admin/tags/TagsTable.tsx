"use client"

import { useCallback, useMemo, useState } from "react"
import { Tags } from "lucide-react"

import {
  DataTable,
  type Column,
  type Facet,
  type GroupBy,
} from "@/components/features/admin/table/DataTable"
import {
  headerBadge,
  type DetailContent,
  type DetailRow,
} from "@/components/features/admin/detail/DetailDialog"
import { NameSlugCell } from "@/components/features/admin/table/NameSlugCell"
import { actionsColumn, HEADER_BADGE_PROPS } from "@/components/features/admin/table/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteTagDialog } from "@/components/features/admin/tags/DeleteTagDialog"
import { TagFormDialog } from "@/components/features/admin/tags/TagFormDialog"
import { Badge } from "@/components/ui/badge"
import type { TagKind } from "@/generated/prisma/client"
import { TAG_COLUMN_WIDTHS } from "@/lib/admin/table-widths"
import { useRowDetail } from "@/hooks/use-row-detail"
import { TagIcon } from "@/lib/icons"
import {
  emptyTagCountByKind,
  KIND_ORDER,
  TAG_FIELD_LABELS,
  TAG_KIND_GROUP_LABELS,
  TAG_KIND_LABELS,
  type TagCountByKind,
} from "@/lib/tags"
import { reorderTags } from "@/server/actions/tags"
import type { AdminTag } from "@/server/queries/tags"

function buildColumns(counts: TagCountByKind): readonly Column<AdminTag>[] {
  return [
    {
      key: "name",
      header: TAG_FIELD_LABELS.nameFr,
      width: TAG_COLUMN_WIDTHS.name,
      sortValue: (tag) => tag.nameFr,
      searchValue: (tag) => `${tag.nameFr} ${tag.slug}`,
      cell: (tag) => <NameSlugCell name={tag.nameFr} slug={tag.slug} />,
    },
    {
      key: "nameEn",
      header: TAG_FIELD_LABELS.nameEn,
      width: TAG_COLUMN_WIDTHS.nameEn,
      searchValue: (tag) => tag.nameEn,
      cell: (tag) => (
        <TruncateTooltip className="block w-full text-muted-foreground">
          {tag.nameEn}
        </TruncateTooltip>
      ),
      hideable: true,
    },
    {
      key: "kind",
      header: TAG_FIELD_LABELS.kind,
      width: TAG_COLUMN_WIDTHS.kind,
      cell: kindBadge,
      hideable: true,
    },
    {
      key: "icon",
      header: TAG_FIELD_LABELS.icon,
      width: TAG_COLUMN_WIDTHS.icon,
      cell: (tag) => renderTagIcon(tag.icon),
      hideable: true,
    },
    {
      key: "usage",
      header: TAG_FIELD_LABELS.projects,
      width: TAG_COLUMN_WIDTHS.usage,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      sortValue: (tag) => tag._count.projects,
      cell: (tag) => tag._count.projects,
      hideable: true,
    },
    actionsColumn<AdminTag>((tag) => (
      <>
        <TagFormDialog tag={tag} counts={counts} />
        <DeleteTagDialog tag={tag} />
      </>
    )),
  ]
}

function kindBadge(tag: AdminTag) {
  return <Badge {...HEADER_BADGE_PROPS}>{TAG_KIND_LABELS[tag.kind]}</Badge>
}

function renderTagIcon(icon: string | null) {
  if (!icon) return null
  return (
    <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
      <TagIcon icon={icon} className="size-4" />
      <TruncateTooltip className="font-mono text-xs">{icon}</TruncateTooltip>
    </span>
  )
}

function tagDetailRows(tag: AdminTag): readonly DetailRow[] {
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

const groupBy: GroupBy<AdminTag, TagKind> = {
  key: (tag) => tag.kind,
  order: KIND_ORDER,
  label: (key) => TAG_KIND_GROUP_LABELS[key],
}

const facets: readonly Facet<AdminTag, TagKind>[] = [
  {
    key: "kind",
    label: "Catégorie",
    options: KIND_ORDER.map((kind) => ({ value: kind, label: TAG_KIND_LABELS[kind] })),
    value: (tag) => tag.kind,
  },
]

function countByKind(tags: readonly AdminTag[]): TagCountByKind {
  const counts = emptyTagCountByKind()
  for (const tag of tags) {
    counts[tag.kind] += 1
  }
  return counts
}

interface Props {
  tags: readonly AdminTag[]
}

export function TagsTable({ tags }: Props) {
  const counts = useMemo(() => countByKind(tags), [tags])
  const [editingTag, setEditingTag] = useState<AdminTag | null>(null)

  const columns = useMemo(() => buildColumns(counts), [counts])

  const buildDetail = useCallback(
    (tag: AdminTag): DetailContent => ({
      title: tag.nameFr,
      subtitle: tag.slug,
      badges: [headerBadge(tag.kind, TAG_KIND_LABELS)],
      sections: [{ rows: tagDetailRows(tag) }],
      onEdit: () => {
        setEditingTag(tag)
      },
    }),
    [],
  )

  const { open: openDetail, dialog } = useRowDetail({ rows: tags, build: buildDetail })

  return (
    <>
      <DataTable
        rows={tags}
        columns={columns}
        getRowId={(tag) => tag.id}
        orderValue={(tag) => tag.displayOrder}
        searchPlaceholder="Rechercher un nom ou un slug"
        noun="tag"
        groupBy={groupBy}
        facets={facets}
        onReorder={reorderTags}
        onRowClick={openDetail}
        rowLabel={(tag) => tag.nameFr}
        empty={{
          icon: Tags,
          title: "Aucun tag",
          description: "Aucun tag pour le moment. Créez-en un via le bouton ci-dessus.",
        }}
      />
      {dialog}
      {editingTag ? (
        <TagFormDialog
          key={editingTag.id}
          tag={editingTag}
          counts={counts}
          open
          onOpenChange={(open) => {
            if (!open) setEditingTag(null)
          }}
        />
      ) : null}
    </>
  )
}
