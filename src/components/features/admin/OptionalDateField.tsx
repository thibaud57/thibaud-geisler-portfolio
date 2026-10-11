"use client"

import { DatePicker } from "@/components/features/admin/DatePicker"
import { FormField } from "@/components/ui/form-field"
import { toIsoDate } from "@/lib/projects"

interface Props {
  id: string
  name: string
  label: string
  value: Date | undefined
  onChange: (date: Date | undefined) => void
  errors: string[] | undefined
}

export function OptionalDateField({ id, name, label, value, onChange, errors }: Props) {
  return (
    <FormField id={id} label={label} errors={errors}>
      <DatePicker
        id={id}
        value={value}
        onChange={onChange}
        invalid={!!errors?.length}
        clearLabel="Effacer"
      />
      <input type="hidden" name={name} value={value ? toIsoDate(value) : ""} />
    </FormField>
  )
}
