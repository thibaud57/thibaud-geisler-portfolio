"use client"

import { useMemo, useRef, useState } from "react"
import { Tags } from "lucide-react"

import {
  DataTable,
  type Column,
  type Facet,
  type GroupBy,
} from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  DetailDialog,
  type DetailRow,
} from "@/components/features/admin/DetailDialog"
import { NameSlugCell } from "@/components/features/admin/NameSlugCell"
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
  TAG_FIELD_LABELS,
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
    // Nom et slug sur la même cellule, comme la colonne d'ouverture des projets et des entreprises.
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
      cell: (tag) => (
        <Badge variant="outline" meta>
          {TAG_KIND_LABELS[tag.kind]}
        </Badge>
      ),
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
      header: "Projets",
      width: TAG_COLUMN_WIDTHS.usage,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      sortValue: (tag) => tag._count.projects,
      cell: (tag) => tag._count.projects,
      hideable: true,
    },
  ]
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

// Les champs du formulaire, dans son ordre, moins ceux que l'en-tête porte déjà (slug, rang, catégorie).
function tagDetailRows(tag: AdminTag): readonly DetailRow[] {
  return [
    { label: TAG_FIELD_LABELS.nameFr, value: tag.nameFr },
    { label: TAG_FIELD_LABELS.nameEn, value: tag.nameEn },
    { label: TAG_FIELD_LABELS.icon, value: renderTagIcon(tag.icon) },
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
            slug: selectedTag.slug,
            subtitle: (
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-mono">#{selectedTag.displayOrder}</span>
                <Badge variant="outline" meta>
                  {TAG_KIND_LABELS[selectedTag.kind]}
                </Badge>
              </span>
            ),
            sections: [{ rows: tagDetailRows(selectedTag) }],
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
        noun="tag"
        groupBy={groupBy}
        facets={facets}
        onReorder={reorderTags}
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
