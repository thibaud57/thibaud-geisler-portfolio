"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { deleteProject } from "@/server/actions/projects"

interface Props {
  project: { id: string; titleFr: string }
}

export function DeleteProjectDialog({ project }: Props) {
  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${project.titleFr}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
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
