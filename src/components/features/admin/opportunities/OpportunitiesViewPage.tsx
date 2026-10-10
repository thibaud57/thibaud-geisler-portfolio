import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { OpportunitiesTable } from "@/components/features/admin/opportunities/OpportunitiesTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin-routes"
import { opportunitySkeletonWidths } from "@/lib/admin-table-widths"
import { OPPORTUNITY_VIEW_PAGES, type OpportunityView } from "@/lib/opportunity-views"
import { findAllOpportunitiesForAdmin } from "@/server/queries/opportunities"

interface Props {
  view: OpportunityView
  initialDetailId?: string
}

async function OpportunitiesSection({ view, initialDetailId }: Props) {
  const opportunities = await findAllOpportunitiesForAdmin()
  return (
    <OpportunitiesTable
      opportunities={opportunities}
      view={view}
      initialDetailId={initialDetailId}
    />
  )
}

export function OpportunitiesViewPage({ view, initialDetailId }: Props) {
  const { title, subtitle } = OPPORTUNITY_VIEW_PAGES[view]

  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button asChild>
          <Link href={`${ADMIN_OPPORTUNITIES_PATH}/nouvelle`}>
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle opportunité
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={opportunitySkeletonWidths(view)} />}>
        <OpportunitiesSection view={view} initialDetailId={initialDetailId} />
      </Suspense>
    </AdminPageShell>
  )
}
