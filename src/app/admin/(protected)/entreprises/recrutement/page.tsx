import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesRecrutementPage() {
  await getCurrentUser()

  return (
    <CompaniesViewPage
      view="recrutement"
      title="Recrutement"
      subtitle="ESN et cabinets, avec leur historique de propositions."
    />
  )
}
