"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { deleteInterview } from "@/server/actions/interviews"

interface Props {
  interviewId: string
  name: string
}

export function DeleteInterviewDialog({ interviewId, name }: Props) {
  return (
    <ConfirmDeleteDialog
      name={name}
      description="Les entretiens suivants de l'opportunité se renumérotent."
      successMessage="Entretien supprimé"
      onDelete={async () => {
        const result = await deleteInterview(interviewId)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
