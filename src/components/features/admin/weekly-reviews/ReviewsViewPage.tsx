import { ReviewFormDialog } from "@/components/features/admin/weekly-reviews/ReviewFormDialog"
import { ReviewsTable } from "@/components/features/admin/weekly-reviews/ReviewsTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { reviewSkeletonWidths } from "@/components/features/admin/weekly-reviews/review-table-widths"
import { REVIEW_VIEW_PAGES, type ReviewView } from "@/lib/crm/review-views"
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
    <AdminListPage
      title={title}
      subtitle={subtitle}
      actions={<ReviewFormDialog review={null} />}
      skeletonWidths={reviewSkeletonWidths(view)}
    >
      <ReviewsSection view={view} />
    </AdminListPage>
  )
}
