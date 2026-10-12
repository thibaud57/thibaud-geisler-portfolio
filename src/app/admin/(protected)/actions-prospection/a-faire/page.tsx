import { ActionsViewPage } from "@/components/features/admin/prospecting-actions/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminActionsAFairePage() {
  await getCurrentUser()

  return <ActionsViewPage view="a-faire" />
}
