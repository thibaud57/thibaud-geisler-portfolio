import { DeleteProspectingActionDialog } from "@/components/features/admin/prospecting-actions/DeleteProspectingActionDialog"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospecting-actions/ProspectingActionFormDialog"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface Props {
  action: AdminProspectingAction
  personOptions: readonly PersonOption[]
}

export function ActionRowActions({ action, personOptions }: Props) {
  return (
    <>
      <ProspectingActionFormDialog action={action} personOptions={personOptions} />
      <DeleteProspectingActionDialog action={action} />
    </>
  )
}
