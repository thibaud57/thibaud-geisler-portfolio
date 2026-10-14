"use client"

import { useMemo, useState } from "react"

import { DetailDialog } from "@/components/features/admin/detail/DetailDialog"
import { DisabledAddButton } from "@/components/features/admin/detail/PendingRelatedCard"
import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { SignalFormDialog } from "@/components/features/admin/signals/SignalFormDialog"
import { signalRelatedRows } from "@/components/features/admin/signals/signal-rows"
import { useSignalDetail } from "@/components/features/admin/signals/use-signal-detail"
import { SIGNAL_SECTION_TITLES, type SignalItem, type SignalOwner } from "@/lib/crm/signals"

interface Props {
  signals: readonly SignalItem[]
  owner: SignalOwner
  canAdd: boolean
}

export function SignalsCard({ signals, owner, canAdd }: Props) {
  const [now] = useState(() => new Date())
  const { openSignal, editSignal, detailFor, reset, formDialog } = useSignalDetail(now)
  const detail = useMemo(() => detailFor(owner), [detailFor, owner])

  return (
    <>
      <RelatedLinksCard
        title={SIGNAL_SECTION_TITLES.signals}
        links={signalRelatedRows(signals, now, {
          onOpen: openSignal,
          onEdit: (signal) => {
            editSignal(owner, signal)
          },
        })}
        emptyText="Aucun signal."
        action={
          canAdd ? (
            <SignalFormDialog owner={owner} signal={null} />
          ) : (
            <DisabledAddButton label="Nouveau signal" />
          )
        }
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) reset()
        }}
      />
      {formDialog}
    </>
  )
}
