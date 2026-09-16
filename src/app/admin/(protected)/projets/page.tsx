import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminProjetsPage() {
  await getCurrentUser()

  return <AdminPageShell title="Projets" subtitle="Écran à construire." />
}
