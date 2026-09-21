import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminEditProjetPage() {
  await getCurrentUser()

  return <AdminPageShell title="Projet" subtitle="Formulaire à construire." />
}
