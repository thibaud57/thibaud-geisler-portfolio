"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { personDisplayName } from "@/lib/crm/persons"
import { deleteContact } from "@/server/actions/contacts"
import type { AdminContact } from "@/server/queries/contacts"

interface Props {
  contact: AdminContact
}

export function DeleteContactDialog({ contact }: Props) {
  return (
    <ConfirmDeleteDialog
      name={personDisplayName(contact)}
      description="La fiche relation est retirée. Si cette personne n'est pas aussi un lead, sa fiche, ses actions et ses signaux sont supprimés avec elle, elle disparaît de ses entretiens et ses opportunités restent sans apporteur."
      successMessage="Contact supprimé"
      onDelete={async () => {
        const result = await deleteContact(contact.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
