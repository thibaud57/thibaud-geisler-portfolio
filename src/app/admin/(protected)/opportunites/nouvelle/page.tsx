import { Suspense } from "react"

import { OpportunityForm } from "@/components/features/admin/opportunities/OpportunityForm"
import { OpportunityInterviewsCard } from "@/components/features/admin/opportunities/OpportunityInterviewsCard"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin-routes"
import { OPPORTUNITY_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findPersonOptionsWithLeadRole } from "@/server/queries/persons"

async function NewOpportunitySection() {
  const [referrerOptions, companyOptions] = await Promise.all([
    findPersonOptionsWithLeadRole(),
    findCompanyOptions(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: "Opportunités", href: ADMIN_OPPORTUNITIES_PATH },
          { label: "Nouvelle opportunité" },
        ]}
      />
      <OpportunityForm
        opportunity={null}
        referrerOptions={referrerOptions}
        companyOptions={companyOptions}
        relatedCards={<OpportunityInterviewsCard opportunity={null} />}
      />
    </div>
  )
}

export default async function NewOpportunityPage() {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={OPPORTUNITY_PAGE_SKELETON} />}>
        <NewOpportunitySection />
      </Suspense>
    </div>
  )
}
