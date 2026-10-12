"use client"

import type { ReactNode } from "react"

import { EnumSelectItems } from "@/components/features/admin/form/EnumSelectItems"
import { describedBy } from "@/components/features/admin/form/field-aria"
import { FormField } from "@/components/ui/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { IconComponent } from "@/lib/icons"
import { NONE_VALUE } from "@/lib/schemas/none-value"

interface Props {
  id: string
  name: string
  label: string
  options: readonly string[]
  labels: Record<string, string>
  errors: string[] | undefined
  defaultValue?: string
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  icons?: Record<string, IconComponent | null>
  noneLabel?: string
  help?: ReactNode
}

export function SelectField({
  id,
  name,
  label,
  options,
  labels,
  errors,
  defaultValue,
  value,
  onValueChange,
  placeholder,
  icons,
  noneLabel,
  help,
}: Props) {
  return (
    <FormField id={id} label={label} errors={errors} help={help}>
      <Select name={name} defaultValue={defaultValue} value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={!!errors?.length}
          aria-describedby={describedBy(id, help)}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {/* La sentinelle remplace une valeur vide, que Radix refuse ; le schéma la retraduit en null. */}
          {noneLabel ? <SelectItem value={NONE_VALUE}>{noneLabel}</SelectItem> : null}
          <EnumSelectItems values={options} labels={labels} icons={icons} />
        </SelectContent>
      </Select>
    </FormField>
  )
}
