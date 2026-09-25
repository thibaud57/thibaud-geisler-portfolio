import type { LucideIcon } from "lucide-react"
import type { ReactNode } from "react"

import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"

export interface EmptyStateContent {
  icon: LucideIcon
  title: string
  description: ReactNode
}

interface Props extends EmptyStateContent {
  onReset?: () => void
  className?: string
}

export function EmptyState({ icon: Icon, title, description, onReset, className }: Props) {
  return (
    <Empty className={className}>
      <EmptyHeader>
        <EmptyMedia className="text-muted-foreground">
          <Icon />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {onReset ? (
        <EmptyContent>
          <Button type="button" variant="outline" size="sm" onClick={onReset}>
            Réinitialiser les filtres
          </Button>
        </EmptyContent>
      ) : null}
    </Empty>
  )
}
