import { SelectItem } from "@/components/ui/select"

import type { IconComponent } from "@/lib/icons"

interface Props<T extends string> {
  values: readonly T[]
  labels: Record<T, string>
  icons?: Record<T, IconComponent | null>
}

export function EnumSelectItems<T extends string>({ values, labels, icons }: Props<T>) {
  return values.map((value) => {
    const Icon: IconComponent | null = icons?.[value] ?? null
    return (
      <SelectItem key={value} value={value}>
        {Icon ? <Icon aria-hidden /> : null}
        {labels[value]}
      </SelectItem>
    )
  })
}
