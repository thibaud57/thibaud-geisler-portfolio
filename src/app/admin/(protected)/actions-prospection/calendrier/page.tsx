import { Suspense } from "react"

import { ActionsCalendar } from "@/components/features/admin/prospecting-actions/ActionsCalendar"
import { NewActionHeaderButton } from "@/components/features/admin/prospecting-actions/NewActionHeaderButton"
import { AdminPageShell } from "@/components/layout/admin/AdminPageShell"
import { Skeleton } from "@/components/ui/skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findPersonOptionsWithLeadRole, type PersonOption } from "@/server/queries/persons"
import { findAllProspectingActionsForAdmin } from "@/server/queries/prospecting-actions"

async function CalendarSection({ personOptions }: { personOptions: Promise<PersonOption[]> }) {
  const [actions, options] = await Promise.all([findAllProspectingActionsForAdmin(), personOptions])
  return <ActionsCalendar actions={actions} personOptions={options} />
}

export default async function AdminActionsCalendarPage() {
  await getCurrentUser()
  const personOptions = findPersonOptionsWithLeadRole()

  return (
    <AdminPageShell
      title="Calendrier des actions"
      subtitle="Chaque action posée sur sa date."
      actions={<NewActionHeaderButton personOptions={personOptions} />}
    >
      <Suspense fallback={<Skeleton className="h-160 rounded-xl" aria-hidden />}>
        <CalendarSection personOptions={personOptions} />
      </Suspense>
    </AdminPageShell>
  )
}
