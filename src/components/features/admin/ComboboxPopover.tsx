"use client"

import { ChevronsUpDown } from "lucide-react"
import type { ComponentProps, ReactNode, Ref } from "react"

import { Button } from "@/components/ui/button"
import { Command, CommandEmpty, CommandInput, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { filterCommandOption } from "@/lib/search"
import { cn } from "@/lib/utils"

interface Props {
  id: string
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerRef?: Ref<HTMLButtonElement>
  triggerContent: ReactNode
  ariaInvalid?: boolean
  ariaDescribedby?: string
  searchPlaceholder: string
  emptyMessage: string
  filter?: ComponentProps<typeof Command>["filter"]
  modal?: boolean
  popoverContentProps?: Omit<ComponentProps<typeof PopoverContent>, "children">
  commandListClassName?: string
  children: ReactNode
}

// Squelette Popover+Command partagé par tous les combobox admin (sélection simple ou multiple) :
// MultiSelectCombobox, ClientMetaFields, ProjectTagsField, IconCombobox de TagFormDialog.
export function ComboboxPopover({
  id,
  open,
  onOpenChange,
  triggerRef,
  triggerContent,
  ariaInvalid,
  ariaDescribedby,
  searchPlaceholder,
  emptyMessage,
  filter = filterCommandOption,
  modal,
  popoverContentProps,
  commandListClassName,
  children,
}: Props) {
  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={modal}>
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
          {triggerContent}
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        {...popoverContentProps}
        className={cn("w-(--radix-popper-anchor-width) p-0", popoverContentProps?.className)}
      >
        <Command filter={filter}>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList className={commandListClassName}>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            {children}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
