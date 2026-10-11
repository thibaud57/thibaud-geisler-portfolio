import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { InterviewsTable } from "@/components/features/admin/entretiens/InterviewsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin-routes"
import { interviewSkeletonWidths } from "@/lib/admin-table-widths"
import { INTERVIEW_VIEW_PAGES, type InterviewView } from "@/lib/interview-views"
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
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button asChild>
          <Link href={`${ADMIN_INTERVIEWS_PATH}/nouveau`}>
            <Plus aria-hidden data-icon="inline-start" />
            Nouvel entretien
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={interviewSkeletonWidths(view)} />}>
        <InterviewsSection view={view} initialDetailId={initialDetailId} />
      </Suspense>
    </AdminPageShell>
  )
}
