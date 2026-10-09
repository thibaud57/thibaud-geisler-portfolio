"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { personDisplayName } from "@/lib/persons"
import { deleteContact } from "@/server/actions/contacts"
import type { AdminContact } from "@/server/queries/contacts"

interface Props {
  contact: AdminContact
}

export function DeleteContactDialog({ contact }: Props) {
  const name = personDisplayName(contact)

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={name}
      description="La fiche relation est retirée. Si cette personne n'est pas aussi un lead, sa fiche, ses actions et ses signaux sont supprimés avec elle, elle disparaît de ses entretiens et ses opportunités restent sans apporteur."
      successMessage="Contact supprimé"
      onDelete={async () => {
        const result = await deleteContact(contact.id)
        if (result.ok) return { ok: true }
        return {
          ok: false,
          denied: result.message === "contact_not_found" ? "Ce contact a déjà été supprimé" : null,
        }
      }}
    />
  )
}
