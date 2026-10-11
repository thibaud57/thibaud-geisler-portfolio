import { ReviewsViewPage } from "@/components/features/admin/revues/ReviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminReviewsPage() {
  await getCurrentUser()

  return <ReviewsViewPage view="journal" />
}
