import { notFound } from "next/navigation"

import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { InterviewForm } from "@/components/features/admin/interviews/InterviewForm"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin/routes"
import { INTERVIEW_PAGE_SKELETON } from "@/components/features/admin/interviews/interview-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { interviewPlaces, interviewTitleOf } from "@/lib/crm/interviews"
import { findCompanyOptions } from "@/server/queries/companies"
import { findInterviewByIdForAdmin } from "@/server/queries/interviews"
import { findOpportunityOptions } from "@/server/queries/opportunities"
import { findPersonOptions } from "@/server/queries/persons"

async function EditInterviewSection({ id }: { id: string }) {
  const [interview, opportunityOptions, personOptions, companyOptions] = await Promise.all([
    findInterviewByIdForAdmin(id),
    findOpportunityOptions(),
    findPersonOptions(),
    findCompanyOptions(),
  ])
  if (!interview) notFound()

  const title = interviewTitleOf(interview, interviewPlaces(interview.opportunity.interviews), {
    withOpportunity: true,
  })

  return (
    <AdminFormContent
      breadcrumb={[{ label: "Entretiens", href: ADMIN_INTERVIEWS_PATH }, { label: title }]}
    >
      <InterviewForm
        interview={interview}
        title={title}
        opportunityOptions={opportunityOptions}
        personOptions={personOptions}
        companyOptions={companyOptions}
      />
    </AdminFormContent>
  )
}

export default async function EditInterviewPage({ params }: PageProps<"/admin/entretiens/[id]">) {
  await getCurrentUser()
  const { id } = await params

  return (
    <AdminFormPage skeleton={INTERVIEW_PAGE_SKELETON}>
      <EditInterviewSection id={id} />
    </AdminFormPage>
  )
}
