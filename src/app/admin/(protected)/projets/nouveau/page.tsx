import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { ProjectForm } from "@/components/features/admin/projects/ProjectForm"
import { ADMIN_PROJECTS_PATH } from "@/lib/admin/routes"
import { PROJECT_PAGE_SKELETON } from "@/components/features/admin/projects/project-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { listAssets } from "@/server/queries/assets"
import { findCompanyOptions } from "@/server/queries/companies"
import { countProjects } from "@/server/queries/projects"
import { findAllTagsForAdmin } from "@/server/queries/tags"

async function NewProjectSection() {
  const [tags, companies, coverAssets, projectCount] = await Promise.all([
    findAllTagsForAdmin(),
    findCompanyOptions(),
    listAssets("projets/"),
    countProjects(),
  ])

  return (
    <AdminFormContent
      breadcrumb={[{ label: "Projets", href: ADMIN_PROJECTS_PATH }, { label: "Nouveau projet" }]}
    >
      <ProjectForm
        project={null}
        tags={tags}
        companies={companies}
        coverAssets={coverAssets}
        defaultDisplayOrder={projectCount + 1}
      />
    </AdminFormContent>
  )
}

export default async function NewProjectPage() {
  await getCurrentUser()

  return (
    <AdminFormPage skeleton={PROJECT_PAGE_SKELETON}>
      <NewProjectSection />
    </AdminFormPage>
  )
}
