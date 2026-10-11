import { Suspense } from "react"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { ReviewFormDialog } from "@/components/features/admin/revues/ReviewFormDialog"
import { ReviewsTable } from "@/components/features/admin/revues/ReviewsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { reviewSkeletonWidths } from "@/lib/admin-table-widths"
import { REVIEW_VIEW_PAGES, type ReviewView } from "@/lib/review-views"
import { findAllWeeklyReviewsForAdmin } from "@/server/queries/weekly-reviews"

async function ReviewsSection({ view }: { view: ReviewView }) {
  const reviews = await findAllWeeklyReviewsForAdmin()
  return <ReviewsTable reviews={reviews} view={view} />
}

interface Props {
  view: ReviewView
}

export function ReviewsViewPage({ view }: Props) {
  const { title, subtitle } = REVIEW_VIEW_PAGES[view]

  return (
    <AdminPageShell title={title} subtitle={subtitle} actions={<ReviewFormDialog review={null} />}>
      <Suspense fallback={<DataTableSkeleton columnWidths={reviewSkeletonWidths(view)} />}>
        <ReviewsSection view={view} />
      </Suspense>
    </AdminPageShell>
  )
}
