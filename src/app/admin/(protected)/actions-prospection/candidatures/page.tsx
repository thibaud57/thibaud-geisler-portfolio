import { ActionsViewPage } from "@/components/features/admin/prospection/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminActionsCandidaturesPage() {
  await getCurrentUser()

  return <ActionsViewPage view="candidatures" />
}
