import { ProjectsViewPage } from "@/components/features/admin/projects/ProjectsViewPage"
import { getCurrentUser } from "@/lib/get-current-user"

export default async function AdminProjetsPersoPage() {
  await getCurrentUser()

  return <ProjectsViewPage view="perso" />
}
