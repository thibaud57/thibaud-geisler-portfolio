import {
  headerBadge,
  type DetailContent,
  type DetailSection,
} from "@/components/features/admin/detail/DetailDialog"
import { textSection } from "@/components/features/admin/detail/detail-sections"
import { enumBadge } from "@/components/features/admin/display/badges"
import { PersonLink } from "@/components/features/admin/display/record-links"
import { formatShortInstantDate } from "@/lib/date-time"
import {
  ACTION_CHANNEL_ICONS,
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
  PROSPECTING_ACTION_SECTION_TITLES,
  respondedAtLabel,
} from "@/lib/crm/prospecting-actions"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

export function channelBadge(action: AdminProspectingAction, className?: string) {
  return enumBadge(action.channel, ACTION_CHANNEL_LABELS, ACTION_CHANNEL_ICONS, { className })
}

export function buildActionDetail(
  action: AdminProspectingAction,
  onEdit: () => void,
): DetailContent {
  const sections: DetailSection[] = [
    {
      title: PROSPECTING_ACTION_SECTION_TITLES.action,
      rows: [
        {
          label: LABELS.personId,
          value: <PersonLink person={action.person} />,
        },
        { label: LABELS.channel, value: channelBadge(action) },
        { label: LABELS.occurredAt, value: formatShortInstantDate(action.occurredAt) },
        {
          label: respondedAtLabel(action.channel),
          value: formatShortInstantDate(action.respondedAt),
        },
      ],
    },
    textSection(LABELS.message, action.message, { preserveLines: true }),
    textSection(LABELS.reply, action.reply, { preserveLines: true }),
  ]

  return {
    title: action.title,
    badges: [headerBadge(action.status, ACTION_STATUS_LABELS, ACTION_STATUS_ICONS)],
    sections,
    onEdit,
  }
}
