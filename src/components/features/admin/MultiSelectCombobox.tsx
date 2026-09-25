"use client"

import { useMemo, useRef, useState } from "react"
import { X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { CommandGroup, CommandItem } from "@/components/ui/command"

export interface ComboboxOption {
  value: string
  label: string
}

interface Props {
  id: string
  name: string
  options: readonly ComboboxOption[]
  selected: readonly string[]
  onChange: (next: string[]) => void
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  ariaInvalid?: boolean
  ariaDescribedby?: string
}

export function MultiSelectCombobox({
  id,
  name,
  options,
  selected,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  ariaInvalid,
  ariaDescribedby,
}: Props) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const labelByValue = useMemo(
    () => new Map(options.map((option) => [option.value, option.label])),
    [options],
  )

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  // Sans ça, retirer une puce au clavier détruit l'élément focalisé et le focus retombe sur body.
  function removeSelected(value: string) {
    toggle(value)
    triggerRef.current?.focus()
  }

  return (
    <div className="flex flex-col gap-2">
      <ComboboxPopover
        id={id}
        open={open}
        onOpenChange={setOpen}
        triggerRef={triggerRef}
        triggerContent={<span className="text-muted-foreground">{placeholder}</span>}
        ariaInvalid={ariaInvalid}
        ariaDescribedby={ariaDescribedby}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
      >
        <CommandGroup>
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              keywords={[option.label]}
              data-checked={selected.includes(option.value)}
              onSelect={() => {
                toggle(option.value)
              }}
            >
              {option.label}
            </CommandItem>
          ))}
        </CommandGroup>
      </ComboboxPopover>

      {selected.length > 0 ? (
        <div role="list" className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <Badge key={value} variant="secondary" role="listitem" className="gap-1">
              {labelByValue.get(value) ?? value}
              <button
                type="button"
                aria-label={`Retirer ${labelByValue.get(value) ?? value}`}
                onClick={() => {
                  removeSelected(value)
                }}
              >
                <X className="size-3 text-muted-foreground" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  )
}
