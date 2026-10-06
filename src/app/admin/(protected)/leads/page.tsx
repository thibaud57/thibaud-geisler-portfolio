import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

interface Props {
  searchParams: Promise<{ detail?: string }>
}

export default async function AdminLeadsPage({ searchParams }: Props) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <LeadsViewPage view="tous" initialDetailId={detail} />
}
