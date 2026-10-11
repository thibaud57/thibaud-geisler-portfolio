"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { deleteInterview } from "@/server/actions/interviews"
import type { AdminInterview } from "@/server/queries/interviews"

interface Props {
  interview: AdminInterview
  title: string
}

export function DeleteInterviewDialog({ interview, title }: Props) {
  const name = `${title} · ${interview.opportunity.title}`

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={name}
      description="Les entretiens suivants de l'opportunité se renumérotent."
      successMessage="Entretien supprimé"
      onDelete={async () => {
        const result = await deleteInterview(interview.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
