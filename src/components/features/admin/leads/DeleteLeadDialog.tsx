"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { personDisplayName } from "@/lib/persons"
import { deleteLead } from "@/server/actions/leads"
import type { AdminLead } from "@/server/queries/leads"

interface Props {
  lead: AdminLead
}

export function DeleteLeadDialog({ lead }: Props) {
  const name = personDisplayName(lead)

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={name}
      description="Un lead perdu se garde plutôt avec le statut « Perdu ». Si cette personne n'est pas aussi un contact, sa fiche, ses actions et ses signaux sont supprimés avec elle, elle disparaît de ses entretiens et ses opportunités restent sans apporteur."
      successMessage="Lead supprimé"
      onDelete={async () => {
        const result = await deleteLead(lead.id)
        if (result.ok) return { ok: true }
        return {
          ok: false,
          denied: result.message === "lead_not_found" ? "Ce lead a déjà été supprimé" : null,
        }
      }}
    />
  )
}
