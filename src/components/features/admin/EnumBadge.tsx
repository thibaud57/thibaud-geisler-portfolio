import type { ComponentProps } from "react"

import { Badge } from "@/components/ui/badge"
import type { IconComponent } from "@/lib/icons"

interface Props extends Omit<ComponentProps<typeof Badge>, "children"> {
  label: string
  icon: IconComponent | null
}

export function EnumBadge({ label, icon: Icon, variant = "secondary", ...props }: Props) {
  return (
    <Badge variant={variant} {...props}>
      {Icon ? <Icon aria-hidden data-icon="inline-start" /> : null}
      {label}
    </Badge>
  )
}
