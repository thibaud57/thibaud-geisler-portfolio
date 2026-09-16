import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminAssetsPage() {
  await getCurrentUser()

  return <AdminPageShell title="Assets" subtitle="Écran à construire." />
}
