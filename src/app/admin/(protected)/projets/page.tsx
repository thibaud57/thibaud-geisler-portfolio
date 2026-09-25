import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { ProjectsTable } from "@/components/features/admin/projects/ProjectsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { projectSkeletonWidths } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllProjectsForAdmin } from "@/server/queries/projects"

async function ProjectsSection() {
  const projects = await findAllProjectsForAdmin()
  return <ProjectsTable projects={projects} view="tous" />
}

export default async function AdminProjetsPage() {
  await getCurrentUser()

  return (
    <AdminPageShell
      title="Tous les projets"
      subtitle="Clients et perso confondus. Glissez une ligne pour régler l'ordre sur le site."
      actions={
        <Button asChild>
          <Link href="/admin/projets/nouveau">
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau projet
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={projectSkeletonWidths("tous")} />}>
        <ProjectsSection />
      </Suspense>
    </AdminPageShell>
  )
}
