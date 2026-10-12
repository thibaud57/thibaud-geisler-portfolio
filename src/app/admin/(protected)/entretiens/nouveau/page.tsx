import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { InterviewForm } from "@/components/features/admin/interviews/InterviewForm"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin/routes"
import { firstParam } from "@/lib/admin/search-params"
import { INTERVIEW_PAGE_SKELETON } from "@/lib/admin/table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findOpportunityOptions } from "@/server/queries/opportunities"
import { findPersonOptions } from "@/server/queries/persons"

type SearchParams = PageProps<"/admin/entretiens/nouveau">["searchParams"]

async function NewInterviewSection({ searchParams }: { searchParams: SearchParams }) {
  const [{ opportunity }, opportunityOptions, personOptions, companyOptions] = await Promise.all([
    searchParams,
    findOpportunityOptions(),
    findPersonOptions(),
    findCompanyOptions(),
  ])
  const requestedOpportunityId = firstParam(opportunity)
  const defaultOpportunityId = opportunityOptions.some(
    (option) => option.id === requestedOpportunityId,
  )
    ? requestedOpportunityId
    : undefined

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
