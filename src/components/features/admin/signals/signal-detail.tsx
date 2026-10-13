import type { DetailContent, DetailSection } from "@/components/features/admin/detail/DetailDialog"
import { linksSection } from "@/components/features/admin/detail/detail-sections"
import { ExternalUrl } from "@/components/features/admin/display/ExternalUrl"
import { signalRelatedRows } from "@/components/features/admin/signals/signal-rows"
import { ADMIN_COMPANIES_PATH, ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import { detailHref } from "@/lib/admin/detail-links"
import {
  formatSignalDate,
  SIGNAL_FIELD_LABELS,
  SIGNAL_FRESHNESS_LABELS,
  SIGNAL_SECTION_TITLES,
  SIGNAL_TYPE_LABELS,
  signalFreshness,
  type SignalItem,
  type SignalOwner,
  type SignalOwnerKind,
} from "@/lib/crm/signals"

export function signalsSection(
  signals: readonly SignalItem[],
  now: Date,
  onOpen: (signal: SignalItem) => void,
): DetailSection[] {
  return [linksSection(SIGNAL_SECTION_TITLES.signals, signalRelatedRows(signals, now, { onOpen }))]
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
    badges: [freshness ? { label: SIGNAL_FRESHNESS_LABELS[freshness] } : null],
    sections: [
      {
        title: SIGNAL_SECTION_TITLES.signal,
        rows: [
          {
            label: SIGNAL_FIELD_LABELS.sourceUrl,
            value: signal.sourceUrl ? <ExternalUrl url={signal.sourceUrl} /> : null,
          },
          {
            label: SIGNAL_FIELD_LABELS.content,
            value: <span className="whitespace-pre-line">{signal.content}</span>,
            fullWidth: true,
          },
        ],
      },
      linksSection(SIGNAL_SECTION_TITLES.owner, [
        {
          id: owner.id,
          label: owner.name,
          meta: OWNER_KIND_LABELS[owner.kind],
          href: detailHref(OWNER_PATHS[owner.kind], owner.id),
          onClick: onOpen,
        },
      ]),
    ],
    onEdit,
  }
}
