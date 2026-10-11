"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { deleteOpportunity } from "@/server/actions/opportunities"
import type { AdminOpportunity } from "@/server/queries/opportunities"

interface Props {
  opportunity: AdminOpportunity
}

export function DeleteOpportunityDialog({ opportunity }: Props) {
  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${opportunity.title}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={opportunity.title}
      description="Ses entretiens sont supprimés avec elle. L'apporteur, l'ESN et le client final restent."
      successMessage="Opportunité supprimée"
      onDelete={async () => {
        const result = await deleteOpportunity(opportunity.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
