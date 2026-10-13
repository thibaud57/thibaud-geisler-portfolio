"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { weekLabel } from "@/lib/crm/weekly-reviews"
import { deleteWeeklyReview } from "@/server/actions/weekly-reviews"
import type { AdminWeeklyReview } from "@/server/queries/weekly-reviews"

interface Props {
  review: AdminWeeklyReview
}

export function DeleteReviewDialog({ review }: Props) {
  const name = weekLabel(review.closingFriday)

  return (
    <ConfirmDeleteDialog
      name={name}
      description="Les KPIs de cette semaine disparaissent de l'historique. Les actions et les leads comptés ne sont pas touchés."
      successMessage="Revue supprimée"
      onDelete={async () => {
        const result = await deleteWeeklyReview(review.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
