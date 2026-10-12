"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { personDisplayName } from "@/lib/crm/persons"
import { deleteLead } from "@/server/actions/leads"
import type { AdminLead } from "@/server/queries/leads"

interface Props {
  lead: AdminLead
}

export function DeleteLeadDialog({ lead }: Props) {
  return (
    <ConfirmDeleteDialog
      name={personDisplayName(lead)}
      description="Un lead perdu se garde plutôt avec le statut « Perdu ». Ses signaux sont supprimés. Si cette personne n'est pas aussi un contact, sa fiche et ses actions sont supprimées avec elle, elle disparaît de ses entretiens et ses opportunités restent sans apporteur."
      successMessage="Lead supprimé"
      onDelete={async () => {
        const result = await deleteLead(lead.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
