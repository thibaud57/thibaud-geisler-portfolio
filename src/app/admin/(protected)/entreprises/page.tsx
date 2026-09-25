import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { CompaniesTable } from "@/components/features/admin/companies/CompaniesTable"
import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { COMPANY_SKELETON_WIDTHS } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllCompaniesForAdmin } from "@/server/queries/companies"

async function CompaniesSection() {
  const companies = await findAllCompaniesForAdmin()
  return <CompaniesTable companies={companies} />
}

export default async function AdminEntreprisesPage() {
  await getCurrentUser()

  return (
    <AdminPageShell
      title="Toutes les entreprises"
      subtitle="Clients, intermédiaires et prospects."
      actions={
        <Button asChild>
          <Link href="/admin/entreprises/nouvelle">
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle entreprise
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={COMPANY_SKELETON_WIDTHS} />}>
        <CompaniesSection />
      </Suspense>
    </AdminPageShell>
  )
}
