import type { Route } from "next"

import { PendingRelatedCard } from "@/components/features/admin/detail/PendingRelatedCard"
import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { CreateLinkButton } from "@/components/features/admin/form/CreateLinkButton"
import type { RelatedLink } from "@/lib/admin/related-links"

interface Props<T> {
  title: string
  record: T | null
  pendingText: string
  emptyText: string
  links: (record: T) => readonly RelatedLink[]
  createHref: (record: T) => Route
  addLabel: string
}

export function RelatedCreateCard<T>({
  title,
  record,
  pendingText,
  emptyText,
  links,
  createHref,
  addLabel,
}: Props<T>) {
  if (!record) {
    return <PendingRelatedCard title={title} emptyText={pendingText} addLabel={addLabel} />
  }

  return (
    <RelatedLinksCard
      title={title}
      links={links(record)}
      emptyText={emptyText}
      action={
        <CreateLinkButton href={createHref(record)} label={addLabel} variant="outline" size="sm" />
      }
    />
  )
}
