"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { signalLabel, type SignalItem } from "@/lib/signals"
import { deleteSignal } from "@/server/actions/signals"

interface Props {
  signal: SignalItem
}

export function DeleteSignalDialog({ signal }: Props) {
  const name = signalLabel(signal)

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={name}
      successMessage="Signal supprimé"
      onDelete={async () => {
        const result = await deleteSignal(signal.id)
        if (result.ok) return { ok: true }
        return {
          ok: false,
          denied: result.message === "signal_not_found" ? "Ce signal n'existe plus" : null,
        }
      }}
    />
  )
}
