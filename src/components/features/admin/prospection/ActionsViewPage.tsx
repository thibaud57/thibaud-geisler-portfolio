import { Suspense } from "react"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { NewActionHeaderButton } from "@/components/features/admin/prospection/NewActionHeaderButton"
import { ProspectingActionsTable } from "@/components/features/admin/prospection/ProspectingActionsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { ACTION_VIEW_PAGES, type ActionView } from "@/lib/action-views"
import { actionSkeletonWidths } from "@/lib/admin-table-widths"
import { findPersonOptions } from "@/server/queries/persons"
import { findAllProspectingActionsForAdmin } from "@/server/queries/prospecting-actions"

interface SectionProps {
  view: ActionView
  initialDetailId: string | undefined
}

async function ActionsSection({ view, initialDetailId }: SectionProps) {
  const [actions, personOptions] = await Promise.all([
    findAllProspectingActionsForAdmin(),
    findPersonOptions(),
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
    <AdminPageShell title={title} subtitle={subtitle} actions={<NewActionHeaderButton />}>
      <Suspense fallback={<DataTableSkeleton columnWidths={actionSkeletonWidths(view)} />}>
        <ActionsSection view={view} initialDetailId={initialDetailId} />
      </Suspense>
    </AdminPageShell>
  )
}
