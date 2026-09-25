import { notFound } from "next/navigation"
import { Suspense } from "react"

import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { ProjectForm } from "@/components/features/admin/projects/ProjectForm"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllCompaniesForAdmin } from "@/server/queries/companies"
import { listAssets } from "@/server/queries/assets"
import { findProjectForAdmin } from "@/server/queries/projects"
import { findAllTagsForAdmin } from "@/server/queries/tags"

async function EditProjectSection({ id }: { id: string }) {
  const [project, tags, companies, coverAssets] = await Promise.all([
    findProjectForAdmin(id),
    findAllTagsForAdmin(),
    findAllCompaniesForAdmin(),
    listAssets("projets/"),
  ])
  if (!project) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Projets", href: "/admin/projets" }, { label: project.titleFr }]}
      />
      <ProjectForm
        project={project}
        tags={tags}
        companies={companies}
        coverAssets={coverAssets}
        defaultDisplayOrder={project.displayOrder}
      />
    </div>
  )
}

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense
        fallback={
          <StackedSkeleton
            heights={[
              "h-[24px]",
              "h-[320px]",
              "h-[260px]",
              "h-[160px]",
              "h-[320px]",
              "h-[220px]",
              "h-[160px]",
              "h-[220px]",
              "h-[220px]",
            ]}
          />
        }
      >
        <EditProjectSection id={id} />
      </Suspense>
    </div>
  )
}
