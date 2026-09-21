"use client"

import { useMemo, useRef, useState } from "react"
import { Tags } from "lucide-react"
import { toast } from "sonner"

import {
  DataTable,
  type Column,
  type Facet,
  type GroupBy,
} from "@/components/features/admin/DataTable"
import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteTagDialog } from "@/components/features/admin/tags/DeleteTagDialog"
import { TagFormDialog } from "@/components/features/admin/tags/TagFormDialog"
import { Badge } from "@/components/ui/badge"
import type { TagKind } from "@/generated/prisma/client"
import { TAG_COLUMN_WIDTHS } from "@/lib/admin-table-widths"
import { TagIcon } from "@/lib/icons"
import {
  emptyTagCountByKind,
  KIND_ORDER,
  TAG_KIND_GROUP_LABELS,
  TAG_KIND_LABELS,
  type TagCountByKind,
} from "@/lib/tags"
import { reorderTags } from "@/server/actions/tags"
import type { AdminTag } from "@/server/queries/tags"

// Sans la colonne "actions", composée par l'appelant : elle a besoin d'une ref vers son bouton
// d'édition pour que la vue détail rouvre le bon TagFormDialog, et une ref ne se passe pas en
// argument de fonction, seule sa fermeture lexicale garantit qu'elle n'est lue qu'en dehors du
// rendu (réaction de `react-hooks/refs`, ESLint 6+).
function buildColumns(): readonly Column<AdminTag>[] {
  return [
    {
      key: "slug",
      header: "Slug",
      width: TAG_COLUMN_WIDTHS.slug,
      searchValue: (tag) => tag.slug,
      cell: (tag) => (
        <TruncateTooltip className="block w-full font-mono text-sm">{tag.slug}</TruncateTooltip>
      ),
    },
    {
      key: "nameFr",
      header: "Nom (FR)",
      width: TAG_COLUMN_WIDTHS.nameFr,
      sortValue: (tag) => tag.nameFr,
      searchValue: (tag) => tag.nameFr,
      cell: (tag) => (
        <TruncateTooltip className="block w-full font-medium">{tag.nameFr}</TruncateTooltip>
      ),
    },
    {
      key: "nameEn",
      header: "Nom (EN)",
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
      header: "Catégorie",
      width: TAG_COLUMN_WIDTHS.kind,
      cell: (tag) => (
        <Badge variant="outline" meta>
          {TAG_KIND_LABELS[tag.kind]}
        </Badge>
      ),
      hideable: true,
    },
    {
      key: "icon",
      header: "Icône",
      width: TAG_COLUMN_WIDTHS.icon,
      cell: (tag) =>
        tag.icon ? (
          <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
            <TagIcon icon={tag.icon} className="size-4" />
            <TruncateTooltip className="font-mono text-xs">{tag.icon}</TruncateTooltip>
          </span>
        ) : null,
      hideable: true,
    },
    {
      key: "usage",
      header: "Projets",
      width: TAG_COLUMN_WIDTHS.usage,
      align: "right",
      className: "font-mono tabular-nums text-muted-foreground",
      sortValue: (tag) => tag._count.projects,
      cell: (tag) => tag._count.projects,
      hideable: true,
    },
  ]
}

function tagDetailRows(tag: AdminTag): DetailContent["rows"] {
  return [
    { label: "Slug", value: <span className="font-mono">{tag.slug}</span> },
    { label: "Nom (FR)", value: tag.nameFr },
    { label: "Nom (EN)", value: tag.nameEn },
    { label: "Catégorie", value: TAG_KIND_LABELS[tag.kind] },
    {
      label: "Icône",
      value: tag.icon ? (
        <span className="inline-flex items-center gap-2">
          <TagIcon icon={tag.icon} className="size-4" />
          <span className="font-mono text-xs">{tag.icon}</span>
        </span>
      ) : (
        "—"
      ),
    },
    {
      label: "Projets",
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

async function handleReorder(kind: TagKind, orderedIds: string[]): Promise<boolean> {
  const result = await reorderTags(kind, orderedIds)
  if (result.ok) return true

  toast.error(
    result.message === "stale_order"
      ? "La liste a changé entre-temps. Rechargez la page."
      : "Le nouvel ordre n'a pas pu être enregistré.",
  )
  return false
}

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
  const editTriggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const [selectedTag, setSelectedTag] = useState<AdminTag | null>(null)

  // editTriggerRefs doit rester une fermeture lexicale ici, pas un argument (cf. buildColumns).
  const columns = useMemo<readonly Column<AdminTag>[]>(
    () => [
      ...buildColumns(),
      {
        key: "actions",
        header: "Actions",
        width: TAG_COLUMN_WIDTHS.actions,
        align: "right",
        cell: (tag) => (
          <span className="inline-flex gap-0">
            <TagFormDialog
              tag={tag}
              counts={counts}
              triggerRef={(element) => {
                if (element) editTriggerRefs.current.set(tag.id, element)
                else editTriggerRefs.current.delete(tag.id)
              }}
            />
            <DeleteTagDialog tag={tag} />
          </span>
        ),
      },
    ],
    [counts],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedTag
        ? {
            title: selectedTag.nameFr,
            rows: tagDetailRows(selectedTag),
            onEdit: () => {
              editTriggerRefs.current.get(selectedTag.id)?.click()
            },
          }
        : null,
    [selectedTag],
  )

  return (
    <>
      <DataTable
        rows={tags}
        columns={columns}
        getRowId={(tag) => tag.id}
        orderValue={(tag) => tag.displayOrder}
        searchPlaceholder="Rechercher un nom ou un slug"
        countLabel={(count) => (count === 1 ? "1 tag" : `${count} tags`)}
        groupBy={groupBy}
        facets={facets}
        onReorder={handleReorder}
        onRowClick={setSelectedTag}
        rowLabel={(tag) => tag.nameFr}
        empty={{
          icon: Tags,
          title: "Aucun tag",
          description: "Aucun tag pour le moment. Créez-en un via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedTag(null)
        }}
      />
    </>
  )
}
