import { CompaniesViewPage } from "@/components/features/admin/companies/CompaniesViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

interface Props {
  searchParams: Promise<{ detail?: string }>
}

export default async function AdminEntreprisesPage({ searchParams }: Props) {
  await getCurrentUser()
  const { detail } = await searchParams

  return (
    <CompaniesViewPage
      view="toutes"
      title="Toutes les entreprises"
      subtitle="Clients, intermédiaires et prospects."
      initialDetailId={detail}
    />
  )
}
