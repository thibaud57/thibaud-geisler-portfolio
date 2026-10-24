"use client"

import type { ReactNode } from "react"

import { describedBy } from "@/components/features/admin/form/field-aria"
import {
  OptionSelect,
  type NullableOptionSelectProps,
  type RequiredOptionSelectProps,
} from "@/components/features/admin/form/OptionSelect"
import { FormField } from "@/components/ui/form-field"

interface FieldExtras {
  id: string
  name: string
  label: string
  errors: readonly string[] | undefined
  help?: ReactNode
}

type Controlled = keyof FieldExtras | "aria-invalid" | "aria-describedby" | "aria-label"

type RequiredSelectFieldProps<T extends string> = FieldExtras &
  Omit<RequiredOptionSelectProps<T>, Controlled>
export type NullableSelectFieldProps<T extends string> = FieldExtras &
  Omit<NullableOptionSelectProps<T>, Controlled>
type SelectFieldProps<T extends string> = RequiredSelectFieldProps<T> | NullableSelectFieldProps<T>

export function SelectField<T extends string>({
  label,
  errors,
  help,
  ...select
}: SelectFieldProps<T>) {
  return (
    <FormField id={select.id} label={label} errors={errors} help={help}>
      <OptionSelect
        {...select}
        aria-invalid={!!errors?.length}
        aria-describedby={describedBy(select.id, help)}
      />
    </FormField>
  )
}
