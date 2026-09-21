import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminNouveauProjetPage() {
  await getCurrentUser()

  return <AdminPageShell title="Nouveau projet" subtitle="Formulaire à construire." />
}
