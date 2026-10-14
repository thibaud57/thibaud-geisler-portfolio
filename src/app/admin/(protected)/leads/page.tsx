import { LeadsViewPage } from "@/components/features/admin/leads/LeadsViewPage"
import { firstParam } from "@/lib/admin/search-params"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminLeadsPage({ searchParams }: PageProps<"/admin/leads">) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <LeadsViewPage view="all" initialDetailId={firstParam(detail)} />
}
