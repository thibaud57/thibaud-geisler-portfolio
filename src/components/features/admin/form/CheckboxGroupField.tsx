import type { ReactNode } from "react"

import { describedBy } from "@/components/features/admin/form/field-aria"
import { Checkbox } from "@/components/ui/checkbox"
import { FormField } from "@/components/ui/form-field"
import { Label } from "@/components/ui/label"
import type { IconComponent } from "@/lib/icons"
import { cn } from "@/lib/utils"

interface Props<T extends string> {
  id: string
  name: string
  label: string
  options: readonly T[]
  labels: Record<T, string>
  icons?: Record<T, IconComponent | null>
  defaultValue: readonly string[]
  errors: string[] | undefined
  help?: ReactNode
  columns?: 2 | 3
}

export function CheckboxGroupField<T extends string>({
  id,
  name,
  label,
  options,
  labels,
  icons,
  defaultValue,
  errors,
  help,
  columns = 2,
}: Props<T>) {
  return (
    <FormField id={id} errors={errors} help={help}>
      <span id={`${id}-label`} className="text-sm font-medium">
        {label}
      </span>
      <div
        role="group"
        aria-labelledby={`${id}-label`}
        aria-describedby={describedBy(id, help)}
        className={cn("grid grid-cols-2 gap-x-4 gap-y-2", columns === 3 && "sm:grid-cols-3")}
      >
        {options.map((option) => {
          const Icon: IconComponent | null = icons?.[option] ?? null
          const optionId = `${id}-${option}`
          return (
            <Label key={option} htmlFor={optionId} className="min-w-0 leading-normal font-normal">
              <Checkbox
                id={optionId}
                name={name}
                value={option}
                defaultChecked={defaultValue.includes(option)}
                aria-invalid={!!errors?.length}
              />
              {Icon ? <Icon aria-hidden className="size-4 shrink-0" /> : null}
              {labels[option]}
            </Label>
          )
        })}
      </div>
    </FormField>
  )
}
