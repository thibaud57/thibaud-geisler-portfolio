"use client"

import { useCallback, useMemo, useState } from "react"
import { Tags } from "lucide-react"
import { DataTable, type Column, type GroupBy } from "@/components/features/admin/table/DataTable"
import type { Facet } from "@/lib/admin/facets"
import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import { TitleCell } from "@/components/features/admin/table/TitleCell"
import { actionsColumn } from "@/components/features/admin/table/table-cells"
import { HEADER_BADGE_PROPS } from "@/components/features/admin/display/badges"
import { TruncateTooltip } from "@/components/features/admin/display/TruncateTooltip"
import { DeleteTagDialog } from "@/components/features/admin/tags/DeleteTagDialog"
import { TagFormDialog } from "@/components/features/admin/tags/TagFormDialog"
import { Badge } from "@/components/ui/badge"
import type { TagKind } from "@/generated/prisma/client"
import { TAG_COLUMN_WIDTHS } from "@/components/features/admin/tags/tag-table-widths"
import { useRowDetail } from "@/components/features/admin/detail/use-row-detail"
import {
  KIND_ORDER,
  TAG_FIELD_LABELS,
  TAG_KIND_GROUP_LABELS,
  TAG_KIND_LABELS,
  type TagCountByKind,
} from "@/lib/tags"
import { recordFromKeys } from "@/lib/record-from-keys"
import { reorderTags } from "@/server/actions/tags"
import type { AdminTag } from "@/server/queries/tags"
import { renderTagIcon, tagDetailRows } from "@/components/features/admin/tags/tag-detail"

function buildColumns(counts: TagCountByKind): readonly Column<AdminTag>[] {
  return [
    {
      key: "name",
      header: TAG_FIELD_LABELS.nameFr,
      wrapHeader: true,
      width: TAG_COLUMN_WIDTHS.name,
      sortValue: (tag) => tag.nameFr,
      searchValue: (tag) => `${tag.nameFr} ${tag.slug}`,
      cell: (tag) => <TitleCell title={tag.nameFr} subtitle={tag.slug} mono />,
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

const groupBy: GroupBy<AdminTag, TagKind> = {
  key: (tag) => tag.kind,
  order: KIND_ORDER,
  label: (key) => TAG_KIND_GROUP_LABELS[key],
}

const facets: readonly Facet<AdminTag>[] = [
  {
    key: "kind",
    label: "Catégorie",
    options: KIND_ORDER.map((kind) => ({ value: kind, label: TAG_KIND_LABELS[kind] })),
    values: (tag) => [tag.kind],
  },
]

function countByKind(tags: readonly AdminTag[]): TagCountByKind {
  return recordFromKeys(KIND_ORDER, (kind) => tags.filter((tag) => tag.kind === kind).length)
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
