import { OpportunitiesViewPage } from "@/components/features/admin/opportunities/OpportunitiesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminOpportunitiesAccepteesPage() {
  await getCurrentUser()

  return <OpportunitiesViewPage view="acceptees" />
}
