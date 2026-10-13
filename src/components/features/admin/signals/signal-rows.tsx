import type { RelatedLink } from "@/components/features/admin/detail/RelatedLinksList"
import { EditRowButton } from "@/components/features/admin/table/EditRowButton"
import { DeleteSignalDialog } from "@/components/features/admin/signals/DeleteSignalDialog"
import { toLinkMarker } from "@/lib/crm/link-marker"
import {
  formatSignalDate,
  SIGNAL_FRESHNESS_LABELS,
  SIGNAL_TYPE_ICONS,
  SIGNAL_TYPE_LABELS,
  signalFreshness,
  signalLabel,
  type SignalItem,
} from "@/lib/crm/signals"

interface SignalRowOptions {
  onOpen?: (signal: SignalItem) => void
  onEdit?: (signal: SignalItem) => void
}

export function signalRelatedRows(
  signals: readonly SignalItem[],
  now: Date,
  { onOpen, onEdit }: SignalRowOptions,
): RelatedLink[] {
  return signals.map((signal) => {
    const freshness = signalFreshness(signal, now)
    const freshLabel = freshness ? SIGNAL_FRESHNESS_LABELS[freshness] : null
    return {
      id: signal.id,
      label: SIGNAL_TYPE_LABELS[signal.type],
      meta: freshLabel ? `${freshLabel} · ${signal.content}` : signal.content,
      trailing: formatSignalDate(signal),
      at: signal.occurredOn,
      marker: toLinkMarker(SIGNAL_TYPE_ICONS[signal.type]),
      onClick:
        onOpen &&
        (() => {
          onOpen(signal)
        }),
      actions: onEdit && (
        <>
          <EditRowButton
            label={`Modifier ${signalLabel(signal)}`}
            onClick={() => {
              onEdit(signal)
            }}
          />
          <DeleteSignalDialog signal={signal} />
        </>
      ),
    }
  })
}
