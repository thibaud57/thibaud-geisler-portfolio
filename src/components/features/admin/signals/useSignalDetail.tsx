import { useCallback, useState } from "react"

import type { DetailContent } from "@/components/features/admin/DetailDialog"
import { SignalFormDialog } from "@/components/features/admin/signals/SignalFormDialog"
import { buildSignalDetail } from "@/components/features/admin/signals/SignalList"
import type { SignalItem, SignalOwner } from "@/lib/signals"

interface EditingSignal {
  owner: SignalOwner
  signal: SignalItem
}

export function useSignalDetail(now: Date) {
  const [selectedSignal, setSelectedSignal] = useState<SignalItem | null>(null)
  // Survit à la désélection : « Modifier » ferme la vue détail avant d'ouvrir le formulaire.
  const [editing, setEditing] = useState<EditingSignal | null>(null)

  const detailFor = useCallback(
    (owner: SignalOwner): DetailContent | null =>
      selectedSignal
        ? buildSignalDetail(
            selectedSignal,
            owner,
            now,
            () => {
              setSelectedSignal(null)
            },
            () => {
              setEditing({ owner, signal: selectedSignal })
            },
          )
        : null,
    [selectedSignal, now],
  )

  const reset = useCallback(() => {
    setSelectedSignal(null)
  }, [])

  const formDialog = editing ? (
    <SignalFormDialog
      key={editing.signal.id}
      owner={editing.owner}
      signal={editing.signal}
      open
      onOpenChange={(open) => {
        if (!open) setEditing(null)
      }}
    />
  ) : null

  return { openSignal: setSelectedSignal, detailFor, reset, formDialog }
}
