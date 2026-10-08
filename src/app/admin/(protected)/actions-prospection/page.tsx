import { ActionsViewPage } from "@/components/features/admin/prospection/ActionsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

interface Props {
  searchParams: Promise<{ detail?: string }>
}

export default async function AdminActionsPage({ searchParams }: Props) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <ActionsViewPage view="journal" initialDetailId={detail} />
}
