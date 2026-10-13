"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { deleteProject } from "@/server/actions/projects"

interface Props {
  project: { id: string; titleFr: string }
}

export function DeleteProjectDialog({ project }: Props) {
  return (
    <ConfirmDeleteDialog
      name={project.titleFr}
      description={
        <>
          Le projet, sa méta client et ses rattachements de tags partent en cascade. Rien n&apos;est
          récupérable. Les tags et l&apos;entreprise, eux, restent en base.
        </>
      }
      successMessage="Projet supprimé"
      onDelete={async () => {
        const result = await deleteProject(project.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
