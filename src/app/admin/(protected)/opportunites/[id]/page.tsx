import { notFound } from "next/navigation"

import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { OpportunityForm } from "@/components/features/admin/opportunities/OpportunityForm"
import { OpportunityInterviewsCard } from "@/components/features/admin/opportunities/OpportunityInterviewsCard"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import { OPPORTUNITY_PAGE_SKELETON } from "@/components/features/admin/opportunities/opportunity-table-widths"
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
    <AdminFormContent
      breadcrumb={[
        { label: "Opportunités", href: ADMIN_OPPORTUNITIES_PATH },
        { label: opportunity.title },
      ]}
    >
      <OpportunityForm
        opportunity={opportunity}
        referrerOptions={referrerOptions}
        companyOptions={companyOptions}
        relatedCards={<OpportunityInterviewsCard opportunity={opportunity} />}
      />
    </AdminFormContent>
  )
}

export default async function EditOpportunityPage({
  params,
}: PageProps<"/admin/opportunites/[id]">) {
  await getCurrentUser()
  const { id } = await params

  return (
    <AdminFormPage skeleton={OPPORTUNITY_PAGE_SKELETON}>
      <EditOpportunitySection id={id} />
    </AdminFormPage>
  )
}
