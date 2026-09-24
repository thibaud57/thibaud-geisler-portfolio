"use client"

import { useId, useRef, useState } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { Label } from "@/components/ui/label"
import { CommandGroup, CommandItem } from "@/components/ui/command"

import { computeReorderedIds } from "@/lib/reorder"
import { KIND_ORDER, TAG_KIND_GROUP_LABELS } from "@/lib/tags"
import { cn } from "@/lib/utils"
import type { AdminTag } from "@/server/queries/tags"

interface Props {
  tags: AdminTag[]
  defaultSelectedIds: string[]
}

// computeReorderedIds et defaultSelectedIds ne portent que des ids : un id sans tag correspondant
// est ignoré plutôt que de trouer la liste (tag supprimé entre le rendu et la soumission).
function resolveTags(ids: readonly string[], source: readonly AdminTag[]): AdminTag[] {
  const byId = new Map(source.map((tag) => [tag.id, tag]))
  return ids.flatMap((id) => {
    const tag = byId.get(id)
    return tag ? [tag] : []
  })
}

export function ProjectTagsField({ tags, defaultSelectedIds }: Props) {
  const searchId = useId()
  const [open, setOpen] = useState(false)
  const [selectedTags, setSelectedTags] = useState<AdminTag[]>(() =>
    resolveTags(defaultSelectedIds, tags),
  )
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

  const selectedIds = new Set(selectedTags.map((tag) => tag.id))
  const availableTags = tags.filter((tag) => !selectedIds.has(tag.id))

  function selectTag(tag: AdminTag) {
    setSelectedTags((current) => [...current, tag])
    setOpen(false)
  }

  // Sans ça, retirer un tag au clavier détruit l'élément focalisé et le focus retombe sur body.
  function removeTag(id: string) {
    setSelectedTags((current) => current.filter((tag) => tag.id !== id))
    triggerRef.current?.focus()
  }

  function reorder(targetId: string) {
    if (!draggedId) return
    setSelectedTags((current) => {
      const orderedIds = computeReorderedIds(
        current.map((tag) => tag.id),
        draggedId,
        targetId,
      )
      return resolveTags(orderedIds, current)
    })
  }

  function endDrag() {
    setDraggedId(null)
    setDragOverId(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor={searchId}>Ajouter un tag</Label>
        <ComboboxPopover
          id={searchId}
          open={open}
          onOpenChange={setOpen}
          triggerRef={triggerRef}
          triggerContent={<span className="text-muted-foreground">Choisir un tag</span>}
          searchPlaceholder="Rechercher un tag…"
          emptyMessage="Aucun tag ne correspond."
        >
          {KIND_ORDER.map((kind) => {
            const kindTags = availableTags.filter((tag) => tag.kind === kind)
            if (kindTags.length === 0) return null
            return (
              <CommandGroup key={kind} heading={TAG_KIND_GROUP_LABELS[kind]}>
                {kindTags.map((tag) => (
                  <CommandItem
                    key={tag.id}
                    value={tag.id}
                    keywords={[tag.nameFr]}
                    data-checked={false}
                    onSelect={() => {
                      selectTag(tag)
                    }}
                  >
                    {tag.nameFr}
                  </CommandItem>
                ))}
              </CommandGroup>
            )
          })}
        </ComboboxPopover>
        <p className="text-xs text-muted-foreground">
          Un tag choisi s&apos;ajoute à la liste et disparaît d&apos;ici.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-sm font-medium">Tags retenus : glissez pour réordonner</span>
        {selectedTags.length > 0 ? (
          <div role="list" className="flex flex-wrap gap-1.5">
            {selectedTags.map((tag, index) => (
              <Badge
                key={tag.id}
                variant="secondary"
                role="listitem"
                draggable
                onDragStart={() => {
                  setDraggedId(tag.id)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                  if (dragOverId !== tag.id) setDragOverId(tag.id)
                }}
                onDrop={() => {
                  reorder(tag.id)
                  endDrag()
                }}
                onDragEnd={endDrag}
                className={cn(
                  "max-w-full cursor-grab transition-[opacity,box-shadow]",
                  draggedId === tag.id && "cursor-grabbing opacity-40",
                  draggedId &&
                    draggedId !== tag.id &&
                    dragOverId === tag.id &&
                    "ring-2 ring-primary ring-offset-1 ring-offset-card",
                )}
              >
                <span className="font-mono text-[10px] text-muted-foreground">{index + 1}</span>
                <span className="min-w-0 truncate">{tag.nameFr}</span>
                <button
                  type="button"
                  aria-label={`Retirer ${tag.nameFr}`}
                  draggable={false}
                  onClick={() => {
                    removeTag(tag.id)
                  }}
                >
                  <X className="size-3 text-muted-foreground" />
                </button>
              </Badge>
            ))}
          </div>
        ) : (
          <p className="m-0 rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">
            Aucun tag retenu. Le premier coché sera le premier affiché sur le site public.
          </p>
        )}
      </div>

      {selectedTags.map((tag) => (
        <input key={tag.id} type="hidden" name="tagIds" value={tag.id} />
      ))}
    </div>
  )
}
