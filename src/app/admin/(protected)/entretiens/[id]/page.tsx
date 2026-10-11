import { notFound } from "next/navigation"
import { Suspense } from "react"

import { InterviewForm } from "@/components/features/admin/entretiens/InterviewForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin-routes"
import { INTERVIEW_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { interviewPlaces, interviewTitle } from "@/lib/interviews"
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

  const number = interviewPlaces(interview.opportunity.interviews).get(interview.id)?.number ?? null
  const title = `${interviewTitle(interview.type, number)} · ${interview.opportunity.title}`

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Entretiens", href: ADMIN_INTERVIEWS_PATH }, { label: title }]}
      />
      <InterviewForm
        interview={interview}
        title={title}
        opportunityOptions={opportunityOptions}
        personOptions={personOptions}
        companyOptions={companyOptions}
      />
    </div>
  )
}

export default async function EditInterviewPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={INTERVIEW_PAGE_SKELETON} />}>
        <EditInterviewSection id={id} />
      </Suspense>
    </div>
  )
}
