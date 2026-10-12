"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { deleteTag } from "@/server/actions/tags"
import type { AdminTag } from "@/server/queries/tags"

interface Props {
  tag: AdminTag
}

export function DeleteTagDialog({ tag }: Props) {
  const inUseCount = tag._count.projects

  return (
    <ConfirmDeleteDialog
      name={tag.nameFr}
      denied={
        inUseCount > 0
          ? `Ce tag est utilisé par ${inUseCount} projet${inUseCount > 1 ? "s" : ""} et ne peut pas être supprimé.`
          : null
      }
      successMessage="Tag supprimé"
      onDelete={async () => {
        const result = await deleteTag(tag.id)
        if (result.ok) return { ok: true }
        return {
          ok: false,
          denied:
            result.message === "tag_in_use"
              ? "Ce tag est utilisé par des projets et ne peut pas être supprimé."
              : null,
        }
      }}
    />
  )
}
