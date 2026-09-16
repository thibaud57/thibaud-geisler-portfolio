import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminTagsPage() {
  await getCurrentUser()

  return <AdminPageShell title="Tags" subtitle="Écran à construire." />
}
