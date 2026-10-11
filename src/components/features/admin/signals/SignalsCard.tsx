"use client"

import { useState } from "react"

import { RelatedLinksCard } from "@/components/features/admin/RelatedLinksCard"
import { SignalFormDialog } from "@/components/features/admin/signals/SignalFormDialog"
import { signalRelatedRows } from "@/components/features/admin/signals/SignalList"
import type { SignalItem, SignalOwner } from "@/lib/signals"

interface Props {
  signals: readonly SignalItem[]
  owner: SignalOwner
  canAdd: boolean
}

export function SignalsCard({ signals, owner, canAdd }: Props) {
  const [now] = useState(() => new Date())
  // Un instantané survit à la disparition de la ligne : le toast « Ce signal n'existe plus » s'affiche depuis la modale, qui ne doit pas être démontée avec elle.
  const [editing, setEditing] = useState<SignalItem | null>(null)

  return (
    <>
      <RelatedLinksCard
        title="Signaux"
        links={signalRelatedRows(signals, now, { onEdit: setEditing })}
        emptyText="Aucun signal."
        action={canAdd ? <SignalFormDialog owner={owner} signal={null} /> : null}
      />
      {editing ? (
        <SignalFormDialog
          key={editing.id}
          owner={owner}
          signal={editing}
          open
          onOpenChange={(open) => {
            if (!open) setEditing(null)
          }}
        />
      ) : null}
    </>
  )
}
