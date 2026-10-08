import { ActionsViewPage } from "@/components/features/admin/prospection/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminActionsAFairePage() {
  await getCurrentUser()

  return <ActionsViewPage view="a-faire" />
}
