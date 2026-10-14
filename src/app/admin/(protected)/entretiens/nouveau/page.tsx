import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { InterviewForm } from "@/components/features/admin/interviews/InterviewForm"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin/routes"
import { firstParam, knownId } from "@/lib/admin/search-params"
import { INTERVIEW_PAGE_SKELETON } from "@/components/features/admin/interviews/interview-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findOpportunityOptions } from "@/server/queries/opportunities"
import { findPersonOptions, findPersonOptionsWithLeadRole } from "@/server/queries/persons"

type SearchParams = PageProps<"/admin/entretiens/nouveau">["searchParams"]

async function NewInterviewSection({ searchParams }: { searchParams: SearchParams }) {
  const [{ opportunity, lead }, opportunityOptions, personOptions, leadOptions, companyOptions] =
    await Promise.all([
      searchParams,
      findOpportunityOptions(),
      findPersonOptions(),
      findPersonOptionsWithLeadRole(),
      findCompanyOptions(),
    ])
  const defaultOpportunityId = knownId(firstParam(opportunity), opportunityOptions)
  const defaultLeadId = knownId(firstParam(lead), leadOptions)

  return (
    <AdminFormContent
      breadcrumb={[
        { label: "Entretiens", href: ADMIN_INTERVIEWS_PATH },
        { label: "Nouvel entretien" },
      ]}
    >
      <InterviewForm
        interview={null}
        defaultOpportunityId={defaultOpportunityId}
        defaultLeadId={defaultLeadId}
        opportunityOptions={opportunityOptions}
        personOptions={personOptions}
        companyOptions={companyOptions}
      />
    </AdminFormContent>
  )
}

export default async function NewInterviewPage({
  searchParams,
}: PageProps<"/admin/entretiens/nouveau">) {
  await getCurrentUser()

  return (
    <AdminFormPage skeleton={INTERVIEW_PAGE_SKELETON}>
      <NewInterviewSection searchParams={searchParams} />
    </AdminFormPage>
  )
}
