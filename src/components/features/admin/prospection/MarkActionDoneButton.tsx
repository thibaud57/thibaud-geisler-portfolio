"use client"

import { useTransition } from "react"
import { Check } from "lucide-react"
import { toast } from "sonner"

import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { changeProspectingActionStatus } from "@/server/actions/prospecting-actions"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface Props {
  action: AdminProspectingAction
}

export function MarkActionDoneButton({ action }: Props) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await changeProspectingActionStatus(action.id, "FAIT")
      if (result.ok) toast.success("Action marquée faite")
      else toast.error("Une erreur est survenue, réessayez")
    })
  }

  return (
    <RowActionButton
      aria-label={`Marquer fait : ${action.title}`}
      disabled={pending}
      onClick={handleClick}
    >
      <Check className="size-4" />
    </RowActionButton>
  )
}
