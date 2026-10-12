import { Suspense } from "react"

import { ActionsBoard } from "@/components/features/admin/prospecting-actions/ActionsBoard"
import { NewActionHeaderButton } from "@/components/features/admin/prospecting-actions/NewActionHeaderButton"
import { AdminPageShell } from "@/components/layout/admin/AdminPageShell"
import { Skeleton } from "@/components/ui/skeleton"
import { BOARD_STATUSES } from "@/lib/crm/action-board"
import { getCurrentUser } from "@/lib/get-current-user"
import { findPersonOptions } from "@/server/queries/persons"
import { findAllProspectingActionsForAdmin } from "@/server/queries/prospecting-actions"

function BoardSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4" aria-hidden>
      <Skeleton className="h-8 w-45" />
      <div className="grid min-h-0 flex-1 auto-cols-[minmax(13.75rem,1fr)] grid-flow-col gap-4 overflow-hidden">
        {BOARD_STATUSES.map((status) => (
          <Skeleton key={status} className="h-full rounded-xl" />
        ))}
      </div>
    </div>
  )
}

async function BoardSection() {
  const [actions, personOptions] = await Promise.all([
    findAllProspectingActionsForAdmin(),
    findPersonOptions(),
  ])
  return <ActionsBoard actions={actions} personOptions={personOptions} />
}

export default async function AdminActionsPipelinePage() {
  await getCurrentUser()

  return (
    // Hauteur de l'écran moins l'en-tête admin (h-14) : le tableau la remplit, les colonnes défilent chacune, jamais la page.
    <AdminPageShell
      className="h-[calc(100svh-3.5rem)]"
      title="Pipeline de prospection"
      subtitle="Une carte par action, groupées par statut. Le glisser-déposer change le statut."
      actions={<NewActionHeaderButton />}
    >
      <Suspense fallback={<BoardSkeleton />}>
        <BoardSection />
      </Suspense>
    </AdminPageShell>
  )
}
