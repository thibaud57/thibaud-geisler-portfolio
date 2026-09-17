"use client"

import { DataTable, type Column } from "@/components/features/admin/DataTable"
import { DeleteTagDialog } from "@/components/features/admin/tags/DeleteTagDialog"
import { TagFormDialog } from "@/components/features/admin/tags/TagFormDialog"
import { Badge } from "@/components/ui/badge"
import type { Tag } from "@/generated/prisma/client"
import { resolveTagIcon } from "@/lib/icons"
import { TAG_KIND_LABELS } from "@/lib/tags"

const columns: readonly Column<Tag>[] = [
  {
    key: "slug",
    header: "Slug",
    sortValue: (tag) => tag.slug,
    searchValue: (tag) => tag.slug,
    cell: (tag) => tag.slug,
  },
  {
    key: "nameFr",
    header: "Nom (français)",
    sortValue: (tag) => tag.nameFr,
    searchValue: (tag) => tag.nameFr,
    cell: (tag) => tag.nameFr,
  },
  {
    key: "nameEn",
    header: "Nom (anglais)",
    sortValue: (tag) => tag.nameEn,
    searchValue: (tag) => tag.nameEn,
    cell: (tag) => tag.nameEn,
  },
  {
    key: "kind",
    header: "Catégorie",
    sortValue: (tag) => TAG_KIND_LABELS[tag.kind],
    cell: (tag) => (
      <Badge variant="outline" meta>
        {TAG_KIND_LABELS[tag.kind]}
      </Badge>
    ),
  },
  {
    key: "icon",
    header: "Icône",
    cell: (tag) => {
      const Icon = resolveTagIcon(tag.icon)
      return Icon ? <Icon className="size-4" /> : null
    },
  },
  {
    key: "displayOrder",
    header: "Ordre",
    sortValue: (tag) => tag.displayOrder,
    cell: (tag) => tag.displayOrder,
  },
  {
    key: "actions",
    header: "Actions",
    cell: (tag) => (
      <div className="flex justify-end gap-1">
        <TagFormDialog tag={tag} />
        <DeleteTagDialog tag={tag} />
      </div>
    ),
  },
]

interface Props {
  tags: readonly Tag[]
}

export function TagsTable({ tags }: Props) {
  return (
    <DataTable
      rows={tags}
      columns={columns}
      getRowId={(tag) => tag.id}
      empty="Aucun tag pour le moment. Créez-en un via le bouton ci-dessus."
    />
  )
}
