import type { ComponentProps } from "react"

import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { cn } from "@/lib/utils"

export function NumberField({
  className,
  ...props
}: Omit<ComponentProps<typeof FieldInput>, "type" | "inputMode">) {
  return (
    <FieldInput
      type="number"
      inputMode="numeric"
      className={cn("text-right tabular-nums", className)}
      {...props}
    />
  )
}
