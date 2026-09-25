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

async function ClientProjectsSection() {
  const projects = await findAllProjectsForAdmin()
  return <ProjectsTable projects={projects} view="client" />
}

export default async function AdminProjetsClientPage() {
  await getCurrentUser()

  return (
    <AdminPageShell
      title="Projets clients"
      subtitle="Missions et emplois. L'ordre se règle depuis la vue Tous."
      actions={
        <Button asChild>
          <Link href="/admin/projets/nouveau">
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau projet
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={projectSkeletonWidths("client")} />}>
        <ClientProjectsSection />
      </Suspense>
    </AdminPageShell>
  )
}
