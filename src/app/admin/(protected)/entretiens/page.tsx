import { InterviewsViewPage } from "@/components/features/admin/interviews/InterviewsViewPage"
import { firstParam } from "@/lib/admin/search-params"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminInterviewsPage({
  searchParams,
}: PageProps<"/admin/entretiens">) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <InterviewsViewPage view="journal" initialDetailId={firstParam(detail)} />
}
