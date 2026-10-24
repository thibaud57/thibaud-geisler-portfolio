"use client"

import { EnumSelectItems } from "@/components/features/admin/form/EnumSelectItems"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { IconComponent } from "@/lib/icons"
import { requireOption } from "@/lib/is-one-of"
import { NONE_VALUE } from "@/lib/schemas/none-value"

interface OptionBase<T extends string> {
  id?: string
  name?: string
  "aria-label"?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
  options: readonly T[]
  labels: Record<T, string>
  icons?: Record<T, IconComponent | null>
  placeholder?: string
  // undefined : non contrôlé (defaultValue) ; null : contrôlé sans choix ; T : contrôlé avec choix.
  value?: T | null
  defaultValue?: T | null
}

export interface RequiredOptionSelectProps<T extends string> extends OptionBase<T> {
  noneLabel?: undefined
  onValueChange?: (value: T) => void
}

export interface NullableOptionSelectProps<T extends string> extends OptionBase<T> {
  noneLabel: string
  onValueChange?: (value: T | null) => void
}

type OptionSelectProps<T extends string> =
  RequiredOptionSelectProps<T> | NullableOptionSelectProps<T>

export function OptionSelect<T extends string>(props: OptionSelectProps<T>) {
  const { options, labels, icons, placeholder, name, value, defaultValue } = props
  const hasNone = props.noneLabel !== undefined
  // Radix refuse value="" sur un SelectItem : la sentinelle ne sort que d'ici. `value=""` affiche le placeholder.
  const emptyValue = hasNone ? NONE_VALUE : ""
  const radixValue = value === undefined ? undefined : (value ?? emptyValue)
  const radixDefault = defaultValue ?? (hasNone && value === undefined ? NONE_VALUE : undefined)

  // Radix n'émet que les valeurs rendues, plus "" au reset du formulaire (voir useFormActionSubmit).
  function handleChange(raw: string) {
    if (raw === NONE_VALUE || raw === "") {
      if (hasNone) props.onValueChange?.(null)
      return
    }
    props.onValueChange?.(requireOption(options, raw))
  }

  return (
    <Select name={name} value={radixValue} defaultValue={radixDefault} onValueChange={handleChange}>
      <SelectTrigger
        id={props.id}
        className="w-full"
        aria-label={props["aria-label"]}
        aria-invalid={props["aria-invalid"]}
        aria-describedby={props["aria-describedby"]}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {hasNone && <SelectItem value={NONE_VALUE}>{props.noneLabel}</SelectItem>}
        <EnumSelectItems values={options} labels={labels} icons={icons} />
      </SelectContent>
    </Select>
  )
}
