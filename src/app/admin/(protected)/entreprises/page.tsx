import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { firstParam } from "@/lib/admin/search-params"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesPage({
  searchParams,
}: PageProps<"/admin/entreprises">) {
  await getCurrentUser()
  const { detail } = await searchParams

  return <CompaniesViewPage view="all" initialDetailId={firstParam(detail)} />
}
