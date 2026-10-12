import { DeleteProspectingActionDialog } from "@/components/features/admin/prospecting-actions/DeleteProspectingActionDialog"
import { MarkActionDoneButton } from "@/components/features/admin/prospecting-actions/MarkActionDoneButton"
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
      {action.status === "A_FAIRE" ? <MarkActionDoneButton action={action} /> : null}
      <ProspectingActionFormDialog action={action} personOptions={personOptions} />
      <DeleteProspectingActionDialog action={action} />
    </>
  )
}
