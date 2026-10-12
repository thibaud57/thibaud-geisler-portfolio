import { ProjectsViewPage } from "@/components/features/admin/projects/ProjectsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminProjetsClientPage() {
  await getCurrentUser()

  return <ProjectsViewPage view="client" />
}
