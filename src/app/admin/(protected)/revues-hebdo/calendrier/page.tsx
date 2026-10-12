import { ReviewsViewPage } from "@/components/features/admin/weekly-reviews/ReviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminReviewsCalendarPage() {
  await getCurrentUser()

  return <ReviewsViewPage view="calendrier" />
}
