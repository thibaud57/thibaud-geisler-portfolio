import type { ReactNode } from "react"

import {
  RelatedLinksList,
  type RelatedLink,
} from "@/components/features/admin/detail/RelatedLinksList"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface Props {
  title: string
  links: readonly RelatedLink[]
  emptyText: string
  action?: ReactNode
}

export function RelatedLinksCard({ title, links, emptyText, action }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {action ? <CardAction>{action}</CardAction> : null}
      </CardHeader>
      <CardContent>
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <RelatedLinksList links={links} />
        )}
      </CardContent>
    </Card>
  )
}
