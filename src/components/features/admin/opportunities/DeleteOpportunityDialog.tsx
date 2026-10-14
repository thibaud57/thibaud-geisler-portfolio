"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { deleteOpportunity } from "@/server/actions/opportunities"
import type { AdminOpportunity } from "@/server/queries/opportunities"

interface Props {
  opportunity: AdminOpportunity
}

export function DeleteOpportunityDialog({ opportunity }: Props) {
  return (
    <ConfirmDeleteDialog
      name={opportunity.title}
      description="Ses entretiens sont supprimés avec elle. L'apporteur, l'ESN et le client final restent."
      successMessage="Opportunité supprimée"
      onDelete={() => deleteOpportunity(opportunity.id)}
    />
  )
}
