import { notFound } from "next/navigation"
import { Suspense } from "react"

import { OpportunityForm } from "@/components/features/admin/opportunities/OpportunityForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin-routes"
import { OPPORTUNITY_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findOpportunityByIdForAdmin } from "@/server/queries/opportunities"
import { findPersonOptionsWithLeadRole } from "@/server/queries/persons"

async function EditOpportunitySection({ id }: { id: string }) {
  const [opportunity, referrerOptions, companyOptions] = await Promise.all([
    findOpportunityByIdForAdmin(id),
    findPersonOptionsWithLeadRole(),
    findCompanyOptions(),
  ])
  if (!opportunity) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: "Opportunités", href: ADMIN_OPPORTUNITIES_PATH },
          { label: opportunity.title },
        ]}
      />
      <OpportunityForm
        opportunity={opportunity}
        referrerOptions={referrerOptions}
        companyOptions={companyOptions}
      />
    </div>
  )
}

export default async function EditOpportunityPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={OPPORTUNITY_PAGE_SKELETON} />}>
        <EditOpportunitySection id={id} />
      </Suspense>
    </div>
  )
}
