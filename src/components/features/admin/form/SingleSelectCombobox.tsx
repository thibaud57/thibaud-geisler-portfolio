"use client"

import { useState, type ReactNode } from "react"

import { ComboboxPopover } from "@/components/features/admin/form/ComboboxPopover"
import { describedBy } from "@/components/features/admin/form/field-aria"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { FormField } from "@/components/ui/form-field"
import { NONE_VALUE } from "@/lib/schemas/none-value"

export interface SingleSelectOption {
  value: string
  label: string
  keywords?: readonly string[]
  secondary?: string
}

interface Props {
  id: string
  label: string
  options: readonly SingleSelectOption[]
  value: string
  onChange: (value: string) => void
  errors?: string[]
  name?: string
  // Ajoute l'option vide : la valeur vide est alors NONE_VALUE. Sans elle, la valeur vide est "".
  noneLabel?: string
  // Dans une modale : le verrou de défilement du Dialog parent bloquerait sinon la molette sur la liste.
  modal?: boolean
  // Une valeur sortie des options (fiche opposée ou close) garde son libellé affiché sans réapparaître dans la liste.
  selectedFallback?: { value: string; label: string } | null
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  help?: ReactNode
}

export function SingleSelectCombobox({
  id,
  label,
  options,
  value,
  onChange,
  errors,
  name,
  noneLabel,
  modal,
  selectedFallback,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  help,
}: Props) {
  const [open, setOpen] = useState(false)
  const selectedLabel =
    options.find((option) => option.value === value)?.label ??
    (selectedFallback?.value === value ? selectedFallback.label : null)

  function select(next: string) {
    onChange(next)
    setOpen(false)
  }

  return (
    <FormField id={id} label={label} errors={errors} help={help}>
      <ComboboxPopover
        id={id}
        open={open}
        onOpenChange={setOpen}
        modal={modal}
        triggerContent={
          selectedLabel ? (
            <span className="truncate">{selectedLabel}</span>
          ) : (
            <span className="text-muted-foreground">{noneLabel ?? placeholder}</span>
          )
        }
        ariaInvalid={!!errors?.length}
        ariaDescribedby={describedBy(id, help)}
        searchPlaceholder={searchPlaceholder}
        emptyMessage={emptyMessage}
      >
        <CommandGroup>
          {noneLabel ? (
            <CommandItem
              value={NONE_VALUE}
              keywords={[noneLabel]}
              data-checked={value === NONE_VALUE}
              onSelect={() => {
                select(NONE_VALUE)
              }}
            >
              {noneLabel}
            </CommandItem>
          ) : null}
          {options.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              keywords={option.keywords ? [...option.keywords] : [option.label]}
              data-checked={value === option.value}
              onSelect={() => {
                select(option.value)
              }}
            >
              {option.secondary ? (
                <>
                  <span className="truncate">{option.label}</span>
                  <span className="truncate text-muted-foreground">{option.secondary}</span>
                </>
              ) : (
                option.label
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      </ComboboxPopover>
      {name ? <input type="hidden" name={name} value={value} /> : null}
    </FormField>
  )
}
