import { OpportunitiesViewPage } from "@/components/features/admin/opportunities/OpportunitiesViewPage"
import { firstParam } from "@/lib/admin/search-params"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminOpportunitiesPage({
  searchParams,
}: PageProps<"/admin/opportunites">) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <OpportunitiesViewPage view="all" initialDetailId={firstParam(detail)} />
}
