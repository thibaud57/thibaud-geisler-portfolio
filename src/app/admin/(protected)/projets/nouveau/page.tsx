import { Suspense } from "react"

import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { ProjectForm } from "@/components/features/admin/projects/ProjectForm"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllCompaniesForAdmin } from "@/server/queries/companies"
import { listAssets } from "@/server/queries/assets"
import { countProjects } from "@/server/queries/projects"
import { findAllTagsForAdmin } from "@/server/queries/tags"

async function NewProjectSection() {
  const [tags, companies, coverAssets, projectCount] = await Promise.all([
    findAllTagsForAdmin(),
    findAllCompaniesForAdmin(),
    listAssets("projets/"),
    countProjects(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Projets", href: "/admin/projets" }, { label: "Nouveau projet" }]}
      />
      <ProjectForm
        project={null}
        tags={tags}
        companies={companies}
        coverAssets={coverAssets}
        defaultDisplayOrder={projectCount + 1}
      />
    </div>
  )
}

export default async function NewProjectPage() {
  await getCurrentUser()

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
        <NewProjectSection />
      </Suspense>
    </div>
  )
}
