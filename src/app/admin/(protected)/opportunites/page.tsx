import { OpportunitiesViewPage } from "@/components/features/admin/opportunities/OpportunitiesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

interface Props {
  searchParams: Promise<{ detail?: string }>
}

export default async function AdminOpportunitiesPage({ searchParams }: Props) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <OpportunitiesViewPage view="toutes" initialDetailId={detail} />
}
