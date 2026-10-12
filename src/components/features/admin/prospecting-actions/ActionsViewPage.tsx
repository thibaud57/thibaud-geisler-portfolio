import { NewActionHeaderButton } from "@/components/features/admin/prospecting-actions/NewActionHeaderButton"
import { ProspectingActionsTable } from "@/components/features/admin/prospecting-actions/ProspectingActionsTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { ACTION_VIEW_PAGES, type ActionView } from "@/lib/crm/action-views"
import { actionSkeletonWidths } from "@/lib/admin/table-widths"
import { findPersonOptionsWithLeadRole } from "@/server/queries/persons"
import { findAllProspectingActionsForAdmin } from "@/server/queries/prospecting-actions"

interface SectionProps {
  view: ActionView
  initialDetailId: string | undefined
}

async function ActionsSection({ view, initialDetailId }: SectionProps) {
  const [actions, personOptions] = await Promise.all([
    findAllProspectingActionsForAdmin(),
    findPersonOptionsWithLeadRole(),
  ])
  return (
    <ProspectingActionsTable
      actions={actions}
      view={view}
      personOptions={personOptions}
      initialDetailId={initialDetailId}
    />
  )
}

interface Props {
  view: ActionView
  initialDetailId?: string
}

export function ActionsViewPage({ view, initialDetailId }: Props) {
  const { title, subtitle } = ACTION_VIEW_PAGES[view]

  return (
    <AdminListPage
      title={title}
      subtitle={subtitle}
      actions={<NewActionHeaderButton />}
      skeletonWidths={actionSkeletonWidths(view)}
    >
      <ActionsSection view={view} initialDetailId={initialDetailId} />
    </AdminListPage>
  )
}
