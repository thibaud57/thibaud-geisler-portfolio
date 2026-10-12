import { useMemo, useState, type ReactNode } from "react"

import { type DetailContent, DetailDialog } from "@/components/features/admin/detail/DetailDialog"
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
  const [selectedAction, setSelectedAction] = useState<AdminProspectingAction | null>(
    () => actions.find((action) => action.id === initialDetailId) ?? null,
  )
  // Survit à la désélection : « Modifier » ferme la vue détail avant d'ouvrir le formulaire.
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null)

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedAction
        ? buildActionDetail(selectedAction, () => {
            setFormTarget({ action: selectedAction })
          })
        : null,
    [selectedAction],
  )

  const dialogs = (
    <>
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedAction(null)
        }}
      />
      {formTarget ? (
        <ProspectingActionFormDialog
          key={formTarget.action?.id ?? "new"}
          action={formTarget.action}
          defaultDate={formTarget.defaultDate}
          personOptions={personOptions}
          open
          onOpenChange={(open) => {
            if (!open) setFormTarget(null)
          }}
        />
      ) : null}
    </>
  )

  return {
    openDetail: setSelectedAction,
    openCreate: (defaultDate) => {
      setFormTarget({ action: null, defaultDate })
    },
    dialogs,
  }
}
