"use client"

import { useMemo } from "react"
import { toast } from "sonner"

import {
  DataTable,
  type Column,
  type Facet,
  type GroupBy,
} from "@/components/features/admin/DataTable"
import { DeleteTagDialog } from "@/components/features/admin/tags/DeleteTagDialog"
import { TagFormDialog } from "@/components/features/admin/tags/TagFormDialog"
import { Badge } from "@/components/ui/badge"
import type { TagKind } from "@/generated/prisma/client"
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

// Fonction (et non constante module) : la colonne "actions" ferme sur `counts`, dérivé des tags
// déjà chargés par la table, pour préremplir l'ordre du dialogue d'édition sans requête séparée.
function buildColumns(counts: TagCountByKind): readonly Column<AdminTag>[] {
  return [
    {
      key: "slug",
      header: "Slug",
      width: "w-[16%]",
      className: "truncate font-mono text-sm",
      searchValue: (tag) => tag.slug,
      cell: (tag) => tag.slug,
    },
    {
      key: "nameFr",
      header: "Nom (FR)",
      width: "w-[20%]",
      className: "truncate font-medium",
      sortValue: (tag) => tag.nameFr,
      searchValue: (tag) => tag.nameFr,
      cell: (tag) => tag.nameFr,
    },
    {
      key: "nameEn",
      header: "Nom (EN)",
      width: "w-[17%]",
      className: "truncate text-muted-foreground",
      searchValue: (tag) => tag.nameEn,
      cell: (tag) => tag.nameEn,
    },
    {
      key: "kind",
      header: "Catégorie",
      width: "w-[110px]",
      cell: (tag) => (
        <Badge variant="outline" meta>
          {TAG_KIND_LABELS[tag.kind]}
        </Badge>
      ),
    },
    {
      key: "icon",
      header: "Icône",
      width: "w-[170px]",
      cell: (tag) =>
        tag.icon ? (
          <span className="inline-flex min-w-0 items-center gap-2 text-muted-foreground">
            <TagIcon icon={tag.icon} className="size-4" />
            <span className="truncate font-mono text-xs">{tag.icon}</span>
          </span>
        ) : null,
    },
    {
      key: "usage",
      header: "Projets",
      width: "w-[84px]",
      align: "right",
      className: "font-mono tabular-nums text-muted-foreground",
      sortValue: (tag) => tag._count.projects,
      cell: (tag) => tag._count.projects,
    },
    {
      key: "actions",
      header: "Actions",
      width: "w-[76px]",
      align: "right",
      cell: (tag) => (
        <span className="inline-flex gap-0">
          <TagFormDialog tag={tag} counts={counts} />
          <DeleteTagDialog tag={tag} />
        </span>
      ),
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
  const columns = useMemo(() => buildColumns(counts), [counts])

  return (
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
      empty="Aucun tag pour le moment. Créez-en un via le bouton ci-dessus."
    />
  )
}
