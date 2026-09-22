"use client"

import { useMemo, useRef, useState } from "react"
import { ChevronsUpDown, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { filterCommandOption } from "@/lib/search"

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
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            ref={triggerRef}
            type="button"
            variant="outline"
            role="combobox"
            id={id}
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popper-anchor-width) p-0">
          <Command filter={filterCommandOption}>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
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
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

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
