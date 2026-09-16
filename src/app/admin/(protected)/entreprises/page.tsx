import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEntreprisesPage() {
  await getCurrentUser()

  return <AdminPageShell title="Entreprises" subtitle="Écran à construire." />
}
