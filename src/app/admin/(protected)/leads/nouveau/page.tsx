import { Suspense } from "react"

import { LeadActionsCard } from "@/components/features/admin/leads/LeadActionsCard"
import { LeadForm } from "@/components/features/admin/leads/LeadForm"
import { RelatedLinksCard } from "@/components/features/admin/RelatedLinksCard"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { LEAD_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { LEAD_SECTION_TITLES } from "@/lib/leads"
import { findCompanyOptions } from "@/server/queries/companies"

async function NewLeadSection() {
  const companyOptions = await findCompanyOptions()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Leads", href: "/admin/leads" }, { label: "Nouveau lead" }]}
      />
      <LeadForm
        lead={null}
        companyOptions={companyOptions}
        relatedCards={
          <>
            <LeadActionsCard lead={null} actions={[]} />
            <RelatedLinksCard
              title={LEAD_SECTION_TITLES.opportunities}
              links={[]}
              emptyText="Après l'enregistrement du lead."
            />
          </>
        }
      />
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
