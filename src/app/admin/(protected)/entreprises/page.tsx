import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesPage() {
  await getCurrentUser()

  return (
    <CompaniesViewPage
      view="toutes"
      title="Toutes les entreprises"
      subtitle="Clients, intermédiaires et prospects."
    />
  )
}
