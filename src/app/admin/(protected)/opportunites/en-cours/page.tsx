import { OpportunitiesViewPage } from "@/components/features/admin/opportunities/OpportunitiesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminOpportunitiesEnCoursPage() {
  await getCurrentUser()

  return <OpportunitiesViewPage view="en-cours" />
}
