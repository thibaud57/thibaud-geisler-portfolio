import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesProspectsPage() {
  await getCurrentUser()

  return <CompaniesViewPage view="prospects" />
}
