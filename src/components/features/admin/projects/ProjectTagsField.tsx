"use client"

import { useId, useRef, useState } from "react"
import { ChevronsUpDown, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { computeReorderedIds } from "@/lib/reorder"
import { filterCommandOption } from "@/lib/search"
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

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(15rem,1fr))] items-start gap-4">
      <div className="flex min-w-0 flex-col gap-2">
        <Label htmlFor={searchId}>Ajouter un tag</Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              ref={triggerRef}
              type="button"
              variant="outline"
              role="combobox"
              id={searchId}
              aria-expanded={open}
              className="w-full justify-between font-normal"
            >
              <span className="text-muted-foreground">Choisir un tag</span>
              <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-(--radix-popper-anchor-width) p-0">
            <Command filter={filterCommandOption}>
              <CommandInput placeholder="Rechercher un tag…" />
              <CommandList>
                <CommandEmpty>Aucun tag ne correspond.</CommandEmpty>
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
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <p className="text-xs text-muted-foreground">
          Un tag choisi s&apos;ajoute à la liste et disparaît d&apos;ici.
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-sm font-medium">Tags retenus — glissez pour réordonner</span>
        {selectedTags.length > 0 ? (
          <div className="flex flex-col gap-1">
            {selectedTags.map((tag, index) => (
              <div
                key={tag.id}
                draggable
                onDragStart={() => {
                  setDraggedId(tag.id)
                }}
                onDragOver={(event) => {
                  event.preventDefault()
                }}
                onDrop={() => {
                  reorder(tag.id)
                  setDraggedId(null)
                }}
                onDragEnd={() => {
                  setDraggedId(null)
                }}
                className={cn(
                  "flex h-8 cursor-grab items-center gap-2 rounded-md border px-2 text-sm",
                  draggedId === tag.id ? "border-primary bg-accent" : "border-border bg-card",
                )}
              >
                <span className="flex size-4.5 shrink-0 items-center justify-center rounded-sm bg-muted font-mono text-xs text-muted-foreground">
                  {index + 1}
                </span>
                <span className="min-w-0 flex-1 truncate">{tag.nameFr}</span>
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
              </div>
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
