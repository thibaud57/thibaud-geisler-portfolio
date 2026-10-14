"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { signalLabel, type SignalItem } from "@/lib/crm/signals"
import { deleteSignal } from "@/server/actions/signals"

interface Props {
  signal: SignalItem
}

export function DeleteSignalDialog({ signal }: Props) {
  const name = signalLabel(signal)

  return (
    <ConfirmDeleteDialog
      name={name}
      successMessage="Signal supprimé"
      onDelete={() => deleteSignal(signal.id)}
    />
  )
}
