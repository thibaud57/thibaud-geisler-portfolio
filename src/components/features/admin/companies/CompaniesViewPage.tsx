import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { CompaniesTable } from "@/components/features/admin/companies/CompaniesTable"
import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { companySkeletonWidths, type CompanyView } from "@/lib/admin-table-widths"
import { findAllCompaniesForAdmin } from "@/server/queries/companies"

interface SectionProps {
  view: CompanyView
  initialDetailId?: string
}

async function CompaniesSection({ view, initialDetailId }: SectionProps) {
  const companies = await findAllCompaniesForAdmin()
  return <CompaniesTable companies={companies} view={view} initialDetailId={initialDetailId} />
}

interface Props {
  view: CompanyView
  title: string
  subtitle: string
  initialDetailId?: string
}

export function CompaniesViewPage({ view, title, subtitle, initialDetailId }: Props) {
  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button asChild>
          <Link href="/admin/entreprises/nouvelle">
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle entreprise
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={companySkeletonWidths(view)} />}>
        <CompaniesSection view={view} initialDetailId={initialDetailId} />
      </Suspense>
    </AdminPageShell>
  )
}
