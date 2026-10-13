import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { OpportunityForm } from "@/components/features/admin/opportunities/OpportunityForm"
import { OpportunityInterviewsCard } from "@/components/features/admin/opportunities/OpportunityInterviewsCard"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import { firstParam } from "@/lib/admin/search-params"
import { OPPORTUNITY_PAGE_SKELETON } from "@/components/features/admin/opportunities/opportunity-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findPersonOptionsWithLeadRole } from "@/server/queries/persons"

type SearchParams = PageProps<"/admin/opportunites/nouvelle">["searchParams"]

async function NewOpportunitySection({ searchParams }: { searchParams: SearchParams }) {
  const [{ referrer }, referrerOptions, companyOptions] = await Promise.all([
    searchParams,
    findPersonOptionsWithLeadRole(),
    findCompanyOptions(),
  ])
  const requestedReferrerId = firstParam(referrer)
  const defaultReferrerId = referrerOptions.some((option) => option.id === requestedReferrerId)
    ? requestedReferrerId
    : undefined

  return (
    <AdminFormContent
      breadcrumb={[
        { label: "Opportunités", href: ADMIN_OPPORTUNITIES_PATH },
        { label: "Nouvelle opportunité" },
      ]}
    >
      <OpportunityForm
        opportunity={null}
        referrerOptions={referrerOptions}
        companyOptions={companyOptions}
        defaultReferrerId={defaultReferrerId}
        relatedCards={<OpportunityInterviewsCard opportunity={null} />}
      />
    </AdminFormContent>
  )
}

export default async function NewOpportunityPage({
  searchParams,
}: PageProps<"/admin/opportunites/nouvelle">) {
  await getCurrentUser()

  return (
    <AdminFormPage skeleton={OPPORTUNITY_PAGE_SKELETON}>
      <NewOpportunitySection searchParams={searchParams} />
    </AdminFormPage>
  )
}
