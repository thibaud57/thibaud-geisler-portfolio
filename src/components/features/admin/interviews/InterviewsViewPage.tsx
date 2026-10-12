import { InterviewsTable } from "@/components/features/admin/interviews/InterviewsTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin/routes"
import { interviewSkeletonWidths } from "@/lib/admin/table-widths"
import { INTERVIEW_VIEW_PAGES, type InterviewView } from "@/lib/crm/interview-views"
import { findAllInterviewsForAdmin } from "@/server/queries/interviews"

interface Props {
  view: InterviewView
  initialDetailId?: string
}

async function InterviewsSection({ view, initialDetailId }: Props) {
  const interviews = await findAllInterviewsForAdmin()
  return <InterviewsTable interviews={interviews} view={view} initialDetailId={initialDetailId} />
}

export function InterviewsViewPage({ view, initialDetailId }: Props) {
  const { title, subtitle } = INTERVIEW_VIEW_PAGES[view]

  return (
    <AdminListPage
      title={title}
      subtitle={subtitle}
      create={{ href: `${ADMIN_INTERVIEWS_PATH}/nouveau`, label: "Nouvel entretien" }}
      skeletonWidths={interviewSkeletonWidths(view)}
    >
      <InterviewsSection view={view} initialDetailId={initialDetailId} />
    </AdminListPage>
  )
}
