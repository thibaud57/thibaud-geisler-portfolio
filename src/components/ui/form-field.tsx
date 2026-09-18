import type { ReactNode } from "react"

import { Label } from "@/components/ui/label"

interface Props {
  id: string
  label: ReactNode
  error?: ReactNode
  children: ReactNode
}

export function FormField({ id, label, error, children }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      <div id={`${id}-error`} aria-live="polite">
        {error}
      </div>
    </div>
  )
}
