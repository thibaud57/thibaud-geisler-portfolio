import { useCallback, useState, type ReactNode } from "react"

import { useRowDetail } from "@/components/features/admin/detail/use-row-detail"
import { buildActionDetail } from "@/components/features/admin/prospecting-actions/action-detail"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospecting-actions/ProspectingActionFormDialog"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface FormTarget {
  action: AdminProspectingAction | null
  defaultDate?: Date
}

interface Options {
  actions: readonly AdminProspectingAction[]
  personOptions: readonly PersonOption[]
  initialDetailId?: string
}

interface ProspectingActionDetail {
  openDetail: (action: AdminProspectingAction) => void
  openCreate: (defaultDate?: Date) => void
  dialogs: ReactNode
}

export function useProspectingActionDetail({
  actions,
  personOptions,
  initialDetailId,
}: Options): ProspectingActionDetail {
  // Survit à la désélection : « Modifier » ferme la vue détail avant d'ouvrir le formulaire.
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)

  const build = useCallback(
    (action: AdminProspectingAction) =>
      buildActionDetail(action, () => {
        setFormTarget({ action })
      }),
    [],
  )

  const { open, dialog } = useRowDetail({ rows: actions, initialDetailId, build })

  const dialogs = (
    <>
      {dialog}
      {formTarget ? (
        <ProspectingActionFormDialog
          key={formTarget.action?.id ?? "new"}
          action={formTarget.action}
          defaultDate={formTarget.defaultDate}
          personOptions={personOptions}
          open
          onOpenChange={(isOpen) => {
            if (!isOpen) setFormTarget(null)
          }}
        />
      ) : null}
    </>
  )

  return {
    openDetail: open,
    openCreate: (defaultDate) => {
      setFormTarget({ action: null, defaultDate })
    },
    dialogs,
  }
}
