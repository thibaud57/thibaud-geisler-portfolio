import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsEnCoursPage() {
  await getCurrentUser()

  return <LeadsViewPage view="en-cours" />
}
