import { NewActionHeaderButton } from "@/components/features/admin/prospecting-actions/NewActionHeaderButton"
import { ProspectingActionsTable } from "@/components/features/admin/prospecting-actions/ProspectingActionsTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { ACTION_VIEW_PAGES, type ActionView } from "@/lib/crm/action-views"
import { actionSkeletonWidths } from "@/components/features/admin/prospecting-actions/action-table-widths"
import { findPersonOptionsWithLeadRole, type PersonOption } from "@/server/queries/persons"
import { findAllProspectingActionsForAdmin } from "@/server/queries/prospecting-actions"

interface SectionProps {
  view: ActionView
  initialDetailId: string | undefined
  personOptions: Promise<PersonOption[]>
}

async function ActionsSection({ view, initialDetailId, personOptions }: SectionProps) {
  const [actions, options] = await Promise.all([findAllProspectingActionsForAdmin(), personOptions])
  return (
    <ProspectingActionsTable
      actions={actions}
      view={view}
      personOptions={options}
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
  const personOptions = findPersonOptionsWithLeadRole()

  return (
    <AdminListPage
      title={title}
      subtitle={subtitle}
      actions={<NewActionHeaderButton personOptions={personOptions} />}
      skeletonWidths={actionSkeletonWidths(view)}
    >
      <ActionsSection view={view} initialDetailId={initialDetailId} personOptions={personOptions} />
    </AdminListPage>
  )
}
