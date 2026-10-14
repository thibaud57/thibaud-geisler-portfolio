import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsChaudsPage() {
  await getCurrentUser()

  return <LeadsViewPage view="chauds" />
}
