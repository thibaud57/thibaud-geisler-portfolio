import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsStandByPage() {
  await getCurrentUser()

  return <LeadsViewPage view="stand-by" />
}
