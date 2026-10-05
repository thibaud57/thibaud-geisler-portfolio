"use client"

import { type Ref, useImperativeHandle, useState } from "react"
import type { Editor } from "@tiptap/core"
import type { LucideIcon } from "lucide-react"
import { Ban } from "lucide-react"
import { EDITOR_LABELS } from "../labels"

export interface SlashItem {
  title: string
  icon: LucideIcon
  command: (params: { editor: Editor; range: { from: number; to: number } }) => void
}

export interface CommandsListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean
}

interface CommandsListProps {
  items: SlashItem[]
  command: (item: SlashItem) => void
  ref?: Ref<CommandsListHandle>
}

export default function CommandsList({ items, command, ref }: CommandsListProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [previousItems, setPreviousItems] = useState(items)

  if (items !== previousItems) {
    setPreviousItems(items)
    setSelectedIndex(0)
  }

  const selectItem = (index: number) => {
    const item = items[index]
    if (item) command(item)
  }

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (!items.length) return false

      if (event.key === "ArrowUp") {
        event.preventDefault()
        setSelectedIndex((current) => (current + items.length - 1) % items.length)
        return true
      }

      if (event.key === "ArrowDown") {
        event.preventDefault()
        setSelectedIndex((current) => (current + 1) % items.length)
        return true
      }

      if (event.key === "Enter") {
        event.preventDefault()
        selectItem(selectedIndex)
        return true
      }

      return false
    },
  }))

  return (
    <div className="z-50 min-w-44 overflow-hidden rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md">
      {items.length ? (
        items.map((item, index) => (
          <button
            key={item.title}
            type="button"
            onClick={() => {
              selectItem(index)
            }}
            onMouseEnter={() => {
              setSelectedIndex(index)
            }}
            data-selected={selectedIndex === index}
            className="relative flex w-full items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
          >
            <item.icon className="mr-2 size-4" />
            {item.title}
          </button>
        ))
      ) : (
        <div className="flex items-center px-2 py-1.5 text-sm text-muted-foreground">
          <Ban className="mr-2 size-4" />
          {EDITOR_LABELS.noResults}
        </div>
      )}
    </div>
  )
}
