import { ActionsViewPage } from "@/components/features/admin/prospecting-actions/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminActionsConnexionsPage() {
  await getCurrentUser()

  return <ActionsViewPage view="connexions" />
}
