import { useCallback, useState } from "react"

import type { DetailContent } from "@/components/features/admin/detail/DetailDialog"
import { SignalFormDialog } from "@/components/features/admin/signals/SignalFormDialog"
import { buildSignalDetail } from "@/components/features/admin/signals/signal-detail"
import type { SignalItem, SignalOwner } from "@/lib/crm/signals"

interface EditingSignal {
  owner: SignalOwner
  signal: SignalItem
}

export function useSignalDetail(now: Date) {
  const [selectedSignal, setSelectedSignal] = useState<SignalItem | null>(null)
  // Survit à la désélection : « Modifier » ferme la vue détail avant d'ouvrir le formulaire. Cet instantané survit aussi à la disparition de la ligne : le toast « Ce signal n'existe plus » s'affiche depuis la modale, qui ne doit pas être démontée avec elle.
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

  const editSignal = useCallback((owner: SignalOwner, signal: SignalItem) => {
    setEditing({ owner, signal })
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

  return { openSignal: setSelectedSignal, editSignal, detailFor, reset, formDialog }
}
