"use client"

import { useState } from "react"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { FormField } from "@/components/ui/form-field"
import { PERSON_FIELD_LABELS } from "@/lib/persons"
import { NONE_VALUE } from "@/lib/schemas/person"
import type { CompanyOption } from "@/server/queries/companies"

interface Props {
  id: string
  options: readonly CompanyOption[]
  value: string
  onChange: (companyId: string) => void
  errors?: string[]
}

export function CompanyCombobox({ id, options, value, onChange, errors }: Props) {
  const [open, setOpen] = useState(false)
  const selected = options.find((company) => company.id === value) ?? null

  function select(companyId: string) {
    onChange(companyId)
    setOpen(false)
  }

  return (
    <FormField id={id} label={PERSON_FIELD_LABELS.companyId} errors={errors}>
      <ComboboxPopover
        id={id}
        open={open}
        onOpenChange={setOpen}
        triggerContent={
          selected ? (
            <span className="truncate">{selected.name}</span>
          ) : (
            <span className="text-muted-foreground">Aucune</span>
          )
        }
        ariaInvalid={!!errors?.length}
        ariaDescribedby={`${id}-error`}
        searchPlaceholder="Chercher une entreprise"
        emptyMessage="Aucune entreprise ne correspond."
      >
        <CommandGroup>
          <CommandItem
            value={NONE_VALUE}
            keywords={["Aucune"]}
            data-checked={value === NONE_VALUE}
            onSelect={() => {
              select(NONE_VALUE)
            }}
          >
            Aucune
          </CommandItem>
          {options.map((company) => (
            <CommandItem
              key={company.id}
              value={company.id}
              keywords={[company.name]}
              data-checked={value === company.id}
              onSelect={() => {
                select(company.id)
              }}
            >
              {company.name}
            </CommandItem>
          ))}
        </CommandGroup>
      </ComboboxPopover>
      <input type="hidden" name="companyId" value={value} />
    </FormField>
  )
}
