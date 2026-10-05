import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesTravailleesPage() {
  await getCurrentUser()

  return (
    <CompaniesViewPage
      view="travaillees"
      title="Entreprises travaillées"
      subtitle="Celles où une mission a été réalisée, en direct ou via une ESN."
    />
  )
}
