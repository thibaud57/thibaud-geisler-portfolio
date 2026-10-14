"use client"

import { EnumSelectItems } from "@/components/features/admin/form/EnumSelectItems"
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
        // Radix rend une string : seules les options de `values` sont proposées.
        onChange(next as T)
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
