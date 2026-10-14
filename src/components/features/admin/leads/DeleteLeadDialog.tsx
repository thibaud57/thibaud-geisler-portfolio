"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { personDisplayName } from "@/lib/crm/persons"
import { deleteLead } from "@/server/actions/leads"
import type { AdminLead } from "@/server/queries/leads"

interface Props {
  lead: AdminLead
}

const DESCRIPTION =
  "Un lead perdu se garde plutôt avec le statut « Perdu ». Ses signaux sont supprimés. Si cette personne n'est pas aussi un contact, sa fiche et ses actions sont supprimées avec elle, elle disparaît de ses entretiens et ses opportunités restent sans apporteur."

const OPTED_OUT_DESCRIPTION =
  "Ses 3 ans de conservation sont passés : sa fiche d'opposition et ses actions sont supprimées définitivement. Plus rien n'empêchera de reprendre contact avec cette personne."

export function DeleteLeadDialog({ lead }: Props) {
  return (
    <ConfirmDeleteDialog
      name={personDisplayName(lead)}
      description={lead.optedOutAt ? OPTED_OUT_DESCRIPTION : DESCRIPTION}
      successMessage="Lead supprimé"
      onDelete={() => deleteLead(lead.id)}
    />
  )
}
