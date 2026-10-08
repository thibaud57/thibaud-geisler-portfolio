"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { deleteProspectingAction } from "@/server/actions/prospecting-actions"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface Props {
  action: AdminProspectingAction
}

export function DeleteProspectingActionDialog({ action }: Props) {
  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${action.title}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={action.title}
      description="Elle disparaît du journal et de l'historique du lead. Une action sans réponse se garde plutôt avec le statut « Ignoré »."
      successMessage="Action supprimée"
      onDelete={async () => {
        const result = await deleteProspectingAction(action.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
