import { LeadsTable } from "@/components/features/admin/leads/LeadsTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import { leadSkeletonWidths } from "@/lib/admin/table-widths"
import { LEAD_VIEW_PAGES, type LeadView } from "@/lib/crm/lead-views"
import { findAllLeadsForAdmin } from "@/server/queries/leads"
import { findActionTimelinesForAdmin } from "@/server/queries/prospecting-actions"

interface Props {
  view: LeadView
  initialDetailId?: string
}

async function LeadsSection({ view, initialDetailId }: Props) {
  const [leads, actions] = await Promise.all([
    findAllLeadsForAdmin(),
    findActionTimelinesForAdmin(),
  ])
  return (
    <LeadsTable leads={leads} view={view} actions={actions} initialDetailId={initialDetailId} />
  )
}

export function LeadsViewPage({ view, initialDetailId }: Props) {
  const { title, subtitle } = LEAD_VIEW_PAGES[view]

  return (
    <AdminListPage
      title={title}
      subtitle={subtitle}
      create={{ href: `${ADMIN_LEADS_PATH}/nouveau`, label: "Nouveau lead" }}
      skeletonWidths={leadSkeletonWidths(view)}
    >
      <LeadsSection view={view} initialDetailId={initialDetailId} />
    </AdminListPage>
  )
}
