import { Plus } from "lucide-react"

import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { Button } from "@/components/ui/button"

interface Props {
  title: string
  emptyText: string
  addLabel: string
}

export function PendingRelatedCard({ title, emptyText, addLabel }: Props) {
  return (
    <RelatedLinksCard
      title={title}
      links={[]}
      emptyText={emptyText}
      action={<DisabledAddButton label={addLabel} />}
    />
  )
}

export function DisabledAddButton({ label }: { label: string }) {
  return (
    <Button type="button" variant="outline" size="sm" disabled>
      <Plus aria-hidden data-icon="inline-start" />
      {label}
    </Button>
  )
}
