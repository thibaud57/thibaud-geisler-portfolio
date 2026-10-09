import Link from "next/link"

import type { DetailContent, DetailSection } from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { rankLabel } from "@/lib/action-rank"
import { formatShortDateTime } from "@/lib/date-time"
import { personDetailHref } from "@/lib/person-links"
import { personDisplayName } from "@/lib/persons"
import {
  ACTION_CHANNEL_ICONS,
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
} from "@/lib/prospecting-actions"
import { STANDALONE_LINK_CLASS } from "@/lib/typography"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

export function channelBadge(action: AdminProspectingAction, className?: string) {
  return (
    <EnumBadge
      label={ACTION_CHANNEL_LABELS[action.channel]}
      icon={ACTION_CHANNEL_ICONS[action.channel]}
      className={className}
    />
  )
}

export function buildActionDetail(
  action: AdminProspectingAction,
  rank: number,
  onEdit: () => void,
): DetailContent {
  const personHref = personDetailHref(action.person)
  const personName = personDisplayName(action.person)

  const sections: DetailSection[] = [
    {
      title: "Action",
      rows: [
        {
          label: LABELS.personId,
          value: personHref ? (
            <Link href={personHref} className={STANDALONE_LINK_CLASS}>
              {personName}
            </Link>
          ) : (
            <span className="font-medium">{personName}</span>
          ),
        },
        { label: LABELS.channel, value: channelBadge(action) },
        { label: LABELS.occurredAt, value: formatShortDateTime(action.occurredAt) },
        {
          label: LABELS.respondedAt,
          value: formatShortDateTime(action.respondedAt),
        },
      ],
    },
    {
      title: LABELS.message,
      rows: [
        {
          value: action.message ? (
            <span className="whitespace-pre-line">{action.message}</span>
          ) : null,
          fullWidth: true,
        },
      ],
    },
  ]

  return {
    title: action.title,
    subtitle: rankLabel(rank),
    status: (
      <EnumBadge
        label={ACTION_STATUS_LABELS[action.status]}
        icon={ACTION_STATUS_ICONS[action.status]}
        variant="outline"
        meta
      />
    ),
    sections,
    onEdit,
  }
}
