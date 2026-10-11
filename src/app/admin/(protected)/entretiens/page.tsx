import { InterviewsViewPage } from "@/components/features/admin/entretiens/InterviewsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

interface Props {
  searchParams: Promise<{ detail?: string }>
}

export default async function AdminInterviewsPage({ searchParams }: Props) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <InterviewsViewPage view="journal" initialDetailId={detail} />
}
