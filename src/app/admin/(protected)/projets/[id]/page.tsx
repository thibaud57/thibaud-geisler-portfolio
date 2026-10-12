import { notFound } from "next/navigation"

import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { ProjectForm } from "@/components/features/admin/projects/ProjectForm"
import { ADMIN_PROJECTS_PATH } from "@/lib/admin/routes"
import { PROJECT_PAGE_SKELETON } from "@/lib/admin/table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { listAssets } from "@/server/queries/assets"
import { findCompanyOptions } from "@/server/queries/companies"
import { findProjectForAdmin } from "@/server/queries/projects"
import { findAllTagsForAdmin } from "@/server/queries/tags"

async function EditProjectSection({ id }: { id: string }) {
  const [project, tags, companies, coverAssets] = await Promise.all([
    findProjectForAdmin(id),
    findAllTagsForAdmin(),
    findCompanyOptions(),
    listAssets("projets/"),
  ])
  if (!project) notFound()

  return (
    <AdminFormContent
      breadcrumb={[{ label: "Projets", href: ADMIN_PROJECTS_PATH }, { label: project.titleFr }]}
    >
      <ProjectForm
        project={project}
        tags={tags}
        companies={companies}
        coverAssets={coverAssets}
        defaultDisplayOrder={project.displayOrder}
      />
    </AdminFormContent>
  )
}

export default async function EditProjectPage({ params }: PageProps<"/admin/projets/[id]">) {
  await getCurrentUser()
  const { id } = await params

  return (
    <AdminFormPage skeleton={PROJECT_PAGE_SKELETON}>
      <EditProjectSection id={id} />
    </AdminFormPage>
  )
}
