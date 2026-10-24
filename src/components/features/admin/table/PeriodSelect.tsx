"use client"

import { EnumSelectItems } from "@/components/features/admin/form/EnumSelectItems"
import { requireOption } from "@/lib/is-one-of"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"

interface Props<T extends string> {
  value: T
  onChange: (period: T) => void
  values: readonly T[]
  labels: Record<T, string>
}

export function PeriodSelect<T extends string>({ value, onChange, values, labels }: Props<T>) {
  return (
    <Select
      value={value}
      onValueChange={(next) => {
        onChange(requireOption(values, next))
      }}
    >
      <SelectTrigger className="w-50" aria-label="Période">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <EnumSelectItems values={values} labels={labels} />
      </SelectContent>
    </Select>
  )
}
