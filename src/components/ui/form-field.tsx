import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"

interface Props {
  id: string
  label?: ReactNode
  error?: ReactNode
  errors?: readonly string[]
  help?: ReactNode
  children: ReactNode
}

export function FormField({ id, label, error, errors, help, children }: Props) {
  return (
    <div className="flex flex-col gap-2">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      {children}
      <div id={`${id}-error`} aria-live="polite">
        {errors?.[0] ? <p className="text-sm text-destructive">{errors[0]}</p> : error}
      </div>
      {help ? (
        <p id={`${id}-help`} className="text-xs text-muted-foreground">
          {help}
        </p>
      ) : null}
    </div>
  )
}
