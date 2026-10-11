import { Suspense } from "react"

import { InterviewForm } from "@/components/features/admin/entretiens/InterviewForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin-routes"
import { INTERVIEW_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findOpportunityOptions } from "@/server/queries/opportunities"
import { findPersonOptions } from "@/server/queries/persons"

interface SectionProps {
  searchParams: Promise<{ opportunity?: string }>
}

async function NewInterviewSection({ searchParams }: SectionProps) {
  const [{ opportunity }, opportunityOptions, personOptions, companyOptions] = await Promise.all([
    searchParams,
    findOpportunityOptions(),
    findPersonOptions(),
    findCompanyOptions(),
  ])
  const defaultOpportunityId = opportunityOptions.some((option) => option.id === opportunity)
    ? opportunity
    : undefined

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: "Entretiens", href: ADMIN_INTERVIEWS_PATH },
          { label: "Nouvel entretien" },
        ]}
      />
      <InterviewForm
        interview={null}
        defaultOpportunityId={defaultOpportunityId}
        opportunityOptions={opportunityOptions}
        personOptions={personOptions}
        companyOptions={companyOptions}
      />
    </div>
  )
}

export default async function NewInterviewPage({ searchParams }: SectionProps) {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={INTERVIEW_PAGE_SKELETON} />}>
        <NewInterviewSection searchParams={searchParams} />
      </Suspense>
    </div>
  )
}
