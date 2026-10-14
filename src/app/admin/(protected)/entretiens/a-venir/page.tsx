import { InterviewsViewPage } from "@/components/features/admin/interviews/InterviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminInterviewsUpcomingPage() {
  await getCurrentUser()

  return <InterviewsViewPage view="a-venir" />
}
