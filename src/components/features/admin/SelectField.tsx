"use client"

import { EnumSelectItems } from "@/components/features/admin/EnumSelectItems"
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
}: Props) {
  return (
    <FormField id={id} label={label} errors={errors}>
      <Select name={name} defaultValue={defaultValue} value={value} onValueChange={onValueChange}>
        <SelectTrigger
          id={id}
          className="w-full"
          aria-invalid={!!errors?.length}
          aria-describedby={`${id}-error`}
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
