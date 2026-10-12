import { ActionsViewPage } from "@/components/features/admin/prospecting-actions/ActionsViewPage"
import { firstParam } from "@/lib/admin/search-params"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminActionsPage({
  searchParams,
}: PageProps<"/admin/actions-prospection">) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <ActionsViewPage view="journal" initialDetailId={firstParam(detail)} />
}
