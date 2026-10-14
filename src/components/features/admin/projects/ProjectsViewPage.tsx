import { ProjectsTable } from "@/components/features/admin/projects/ProjectsTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { ADMIN_PROJECTS_PATH } from "@/lib/admin/routes"
import { projectSkeletonWidths } from "@/components/features/admin/projects/project-table-widths"
import { PROJECT_VIEW_PAGES, type ProjectView } from "@/lib/project-views"
import { findAllProjectsForAdmin } from "@/server/queries/projects"

interface Props {
  view: ProjectView
}

async function ProjectsSection({ view }: Props) {
  const projects = await findAllProjectsForAdmin()
  return <ProjectsTable projects={projects} view={view} />
}

export function ProjectsViewPage({ view }: Props) {
  const { title, subtitle } = PROJECT_VIEW_PAGES[view]

  return (
    <AdminListPage
      title={title}
      subtitle={subtitle}
      create={{ href: `${ADMIN_PROJECTS_PATH}/nouveau`, label: "Nouveau projet" }}
      skeletonWidths={projectSkeletonWidths(view)}
    >
      <ProjectsSection view={view} />
    </AdminListPage>
  )
}
