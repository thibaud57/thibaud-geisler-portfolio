import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import {
  headerBadge,
  type DetailContent,
  type DetailSection,
} from "@/components/features/admin/detail/DetailDialog"
import { textSection } from "@/components/features/admin/detail/detail-sections"
import { enumBadge, PersonLink } from "@/components/features/admin/table/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { formatShortInstantDate } from "@/lib/date-time"
import { personDisplayName } from "@/lib/crm/persons"
import {
  ACTION_CHANNEL_ICONS,
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
  PROSPECTING_ACTION_SECTION_TITLES,
} from "@/lib/crm/prospecting-actions"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

export function channelBadge(action: AdminProspectingAction, className?: string) {
  return enumBadge(action.channel, ACTION_CHANNEL_LABELS, ACTION_CHANNEL_ICONS, { className })
}

export function personCell(action: AdminProspectingAction) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {action.person.company ? (
        <CompanyLogoTile logoFilename={action.person.company.logoFilename} size="sm" />
      ) : null}
      <TruncateTooltip className="min-w-0">{personDisplayName(action.person)}</TruncateTooltip>
    </span>
  )
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
          value: <PersonLink person={action.person}>{personCell(action)}</PersonLink>,
        },
        { label: LABELS.channel, value: channelBadge(action) },
        { label: LABELS.occurredAt, value: formatShortInstantDate(action.occurredAt) },
        { label: LABELS.respondedAt, value: formatShortInstantDate(action.respondedAt) },
      ],
    },
    textSection(LABELS.message, action.message, { preserveLines: true }),
  ]

  return {
    title: action.title,
    badges: [headerBadge(action.status, ACTION_STATUS_LABELS, ACTION_STATUS_ICONS)],
    sections,
    onEdit,
  }
}
