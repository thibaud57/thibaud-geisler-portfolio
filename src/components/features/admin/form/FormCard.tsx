import type { ReactNode } from "react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface Props {
  title: ReactNode
  titleId?: string
  description?: ReactNode
  columns?: 1 | 2
  action?: ReactNode
  children: ReactNode
}

export function FormCard({ title, titleId, description, columns = 1, action, children }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle id={titleId}>{title}</CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {action ? <CardAction className="self-end">{action}</CardAction> : null}
      </CardHeader>
      <CardContent className={cn("grid gap-4", columns === 2 && "sm:grid-cols-2")}>
        {children}
      </CardContent>
    </Card>
  )
}
