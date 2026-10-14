import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsAQualifierPage() {
  await getCurrentUser()

  return <LeadsViewPage view="a-qualifier" />
}
