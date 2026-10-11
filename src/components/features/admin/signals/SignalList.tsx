import { Pencil } from "lucide-react"

import type { DetailContent, DetailSection } from "@/components/features/admin/DetailDialog"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { RelatedLinksList, type RelatedLink } from "@/components/features/admin/RelatedLinksList"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { DeleteSignalDialog } from "@/components/features/admin/signals/DeleteSignalDialog"
import { Badge } from "@/components/ui/badge"
import { ADMIN_COMPANIES_PATH, ADMIN_LEADS_PATH } from "@/lib/admin-routes"
import { detailHref } from "@/lib/detail-links"
import {
  formatSignalDate,
  SIGNAL_FIELD_LABELS,
  SIGNAL_FRESHNESS_LABELS,
  SIGNAL_TYPE_LABELS,
  signalFreshness,
  signalLabel,
  type SignalItem,
  type SignalOwner,
  type SignalOwnerKind,
} from "@/lib/signals"

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
      onClick:
        onOpen &&
        (() => {
          onOpen(signal)
        }),
      actions: onEdit && (
        <>
          <RowActionButton
            aria-label={`Modifier ${signalLabel(signal)}`}
            onClick={() => {
              onEdit(signal)
            }}
          >
            <Pencil className="size-4" />
          </RowActionButton>
          <DeleteSignalDialog signal={signal} />
        </>
      ),
    }
  })
}

export function signalsSection(
  signals: readonly SignalItem[],
  now: Date,
  onOpen: (signal: SignalItem) => void,
): DetailSection[] {
  return [
    {
      title: "Signaux",
      rows: [
        {
          fullWidth: true,
          value:
            signals.length === 0 ? null : (
              <RelatedLinksList links={signalRelatedRows(signals, now, { onOpen })} />
            ),
        },
      ],
    },
  ]
}

const OWNER_KIND_LABELS: Record<SignalOwnerKind, string> = {
  company: "Entreprise",
  lead: "Lead",
}

const OWNER_PATHS: Record<SignalOwnerKind, string> = {
  company: ADMIN_COMPANIES_PATH,
  lead: ADMIN_LEADS_PATH,
}

export function buildSignalDetail(
  signal: SignalItem,
  owner: SignalOwner,
  now: Date,
  onOpen: () => void,
  onEdit: () => void,
): DetailContent {
  const freshness = signalFreshness(signal, now)

  return {
    title: SIGNAL_TYPE_LABELS[signal.type],
    subtitle: formatSignalDate(signal),
    ...(freshness
      ? {
          status: (
            <Badge variant="outline" meta>
              {SIGNAL_FRESHNESS_LABELS[freshness]}
            </Badge>
          ),
        }
      : {}),
    sections: [
      {
        title: "Signal",
        rows: [
          {
            label: SIGNAL_FIELD_LABELS.sourceUrl,
            value: signal.sourceUrl ? <ExternalUrl url={signal.sourceUrl} /> : null,
            fullWidth: true,
          },
          {
            label: SIGNAL_FIELD_LABELS.content,
            value: <span className="whitespace-pre-line">{signal.content}</span>,
            fullWidth: true,
          },
        ],
      },
      {
        title: "Rattaché à",
        rows: [
          {
            fullWidth: true,
            value: (
              <RelatedLinksList
                links={[
                  {
                    id: owner.id,
                    label: owner.name,
                    meta: OWNER_KIND_LABELS[owner.kind],
                    href: detailHref(OWNER_PATHS[owner.kind], owner.id),
                    onClick: onOpen,
                  },
                ]}
              />
            ),
          },
        ],
      },
    ],
    onEdit,
  }
}
