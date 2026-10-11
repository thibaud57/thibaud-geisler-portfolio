import { Plus } from "lucide-react"

import { RelatedLinksCard } from "@/components/features/admin/RelatedLinksCard"
import { Button } from "@/components/ui/button"

export function PendingSignalsCard({ emptyText }: { emptyText: string }) {
  return (
    <RelatedLinksCard
      title="Signaux"
      links={[]}
      emptyText={emptyText}
      action={
        <Button type="button" variant="outline" size="sm" disabled>
          <Plus aria-hidden data-icon="inline-start" />
          Nouveau signal
        </Button>
      }
    />
  )
}
