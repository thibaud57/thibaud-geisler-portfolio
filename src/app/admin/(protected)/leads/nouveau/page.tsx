import { Suspense } from "react"

import { LeadForm } from "@/components/features/admin/leads/LeadForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { LEAD_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"

async function NewLeadSection() {
  const companyOptions = await findCompanyOptions()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Leads", href: "/admin/leads" }, { label: "Nouveau lead" }]}
      />
      <LeadForm lead={null} companyOptions={companyOptions} />
    </div>
  )
}

export default async function NewLeadPage() {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={LEAD_PAGE_SKELETON} />}>
        <NewLeadSection />
      </Suspense>
    </div>
  )
}
