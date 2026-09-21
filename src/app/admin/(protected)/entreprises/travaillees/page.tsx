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

async function WorkedCompaniesSection() {
  const companies = await findAllCompaniesForAdmin()
  return <CompaniesTable companies={companies} workedOnly />
}

export default async function AdminEntreprisesTravailleesPage() {
  await getCurrentUser()

  return (
    <AdminPageShell
      title="Entreprises travaillées"
      subtitle="Celles qui figurent sur le site : missions et emplois."
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
        <WorkedCompaniesSection />
      </Suspense>
    </AdminPageShell>
  )
}
