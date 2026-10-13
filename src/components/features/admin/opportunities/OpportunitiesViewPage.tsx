import { OpportunitiesTable } from "@/components/features/admin/opportunities/OpportunitiesTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import { opportunitySkeletonWidths } from "@/components/features/admin/opportunities/opportunity-table-widths"
import { OPPORTUNITY_VIEW_PAGES, type OpportunityView } from "@/lib/crm/opportunity-views"
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
    <AdminListPage
      title={title}
      subtitle={subtitle}
      create={{ href: `${ADMIN_OPPORTUNITIES_PATH}/nouvelle`, label: "Nouvelle opportunité" }}
      skeletonWidths={opportunitySkeletonWidths(view)}
    >
      <OpportunitiesSection view={view} initialDetailId={initialDetailId} />
    </AdminListPage>
  )
}
