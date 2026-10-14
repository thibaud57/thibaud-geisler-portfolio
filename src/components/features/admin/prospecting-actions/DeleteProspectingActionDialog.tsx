"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { deleteProspectingAction } from "@/server/actions/prospecting-actions"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface Props {
  action: AdminProspectingAction
}

export function DeleteProspectingActionDialog({ action }: Props) {
  return (
    <ConfirmDeleteDialog
      name={action.title}
      description="Elle disparaît du journal et de l'historique du lead. Une action sans réponse se garde plutôt avec le statut « Ignoré »."
      successMessage="Action supprimée"
      onDelete={() => deleteProspectingAction(action.id)}
    />
  )
}
