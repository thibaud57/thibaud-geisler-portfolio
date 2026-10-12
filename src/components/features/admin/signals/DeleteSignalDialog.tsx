"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
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
      onDelete={async () => {
        const result = await deleteSignal(signal.id)
        return result.ok ? { ok: true } : { ok: false, denied: null }
      }}
    />
  )
}
