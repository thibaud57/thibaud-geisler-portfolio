"use client"

import { useMemo, useState } from "react"
import { Send } from "lucide-react"

import { CompanyLogoTile } from "@/components/features/admin/CompanyLogoTile"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { actionsColumn, hideableColumn } from "@/components/features/admin/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteProspectingActionDialog } from "@/components/features/admin/prospection/DeleteProspectingActionDialog"
import {
  buildActionDetail,
  channelBadge,
} from "@/components/features/admin/prospection/action-detail"
import { MarkActionDoneButton } from "@/components/features/admin/prospection/MarkActionDoneButton"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import { rankActions, rankLabel } from "@/lib/action-rank"
import { actionsForView, type ActionView } from "@/lib/action-views"
import { ACTION_COLUMN_WIDTHS, ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS } from "@/lib/admin-table-widths"
import { calendarDaysBetween, formatShortDateTime } from "@/lib/date-time"
import { personDisplayName } from "@/lib/persons"
import {
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
} from "@/lib/prospecting-actions"
import { ACTION_CHANNELS, ACTION_STATUSES } from "@/lib/schemas/prospecting-action"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

function personCell(action: AdminProspectingAction) {
  return (
    <span className="flex min-w-0 items-center gap-2">
      {action.person.company ? (
        <CompanyLogoTile logoFilename={action.person.company.logoFilename} size="sm" />
      ) : null}
      <TruncateTooltip className="min-w-0">{personDisplayName(action.person)}</TruncateTooltip>
    </span>
  )
}

function buildDataColumns(
  view: ActionView,
  ranks: Map<string, number>,
): readonly Column<AdminProspectingAction>[] {
  const visibleByDefault = ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  return [
    {
      key: "title",
      header: LABELS.title,
      width: ACTION_COLUMN_WIDTHS.title,
      sortValue: (action) => action.title,
      searchValue: (action) => `${action.title} ${personDisplayName(action.person)}`,
      cell: (action) => (
        <TruncateTooltip className="block w-full font-medium">{action.title}</TruncateTooltip>
      ),
    },
    {
      key: "rank",
      header: "Rang",
      width: ACTION_COLUMN_WIDTHS.rank,
      className: "text-muted-foreground",
      ...hideableColumn(visibleByDefault, "rank"),
      sortValue: (action) => ranks.get(action.id) ?? 0,
      cell: (action) => rankLabel(ranks.get(action.id) ?? 0),
    },
    {
      key: "channel",
      header: LABELS.channel,
      width: ACTION_COLUMN_WIDTHS.channel,
      ...hideableColumn(visibleByDefault, "channel"),
      cell: channelBadge,
    },
    {
      key: "status",
      header: LABELS.status,
      width: ACTION_COLUMN_WIDTHS.status,
      ...hideableColumn(visibleByDefault, "status"),
      cell: (action) => (
        <EnumBadge
          label={ACTION_STATUS_LABELS[action.status]}
          icon={ACTION_STATUS_ICONS[action.status]}
        />
      ),
    },
    {
      key: "occurredAt",
      header: LABELS.occurredAt,
      width: ACTION_COLUMN_WIDTHS.occurredAt,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "occurredAt"),
      sortValue: (action) => action.occurredAt.getTime(),
      cell: (action) => formatShortDateTime(action.occurredAt),
    },
    {
      key: "person",
      header: LABELS.personId,
      width: ACTION_COLUMN_WIDTHS.person,
      ...hideableColumn(visibleByDefault, "person"),
      sortValue: (action) => personDisplayName(action.person),
      cell: personCell,
    },
  ]
}

interface Props {
  actions: readonly AdminProspectingAction[]
  view: ActionView
  personOptions: readonly PersonOption[]
  initialDetailId?: string
}

export function ProspectingActionsTable({ actions, view, personOptions, initialDetailId }: Props) {
  const [selectedAction, setSelectedAction] = useState<AdminProspectingAction | null>(
    () => actions.find((action) => action.id === initialDetailId) ?? null,
  )
  const [editingAction, setEditingAction] = useState<AdminProspectingAction | null>(null)
  // Instant figé au montage : le filtre Période reste stable pendant la consultation.
  const [now] = useState(() => new Date())

  // Le rang se calcule sur toutes les actions, jamais sur la seule vue affichée.
  const ranks = useMemo(() => rankActions(actions), [actions])
  const viewActions = useMemo(() => actionsForView(actions, view), [actions, view])

  const facets = useMemo<readonly Facet<AdminProspectingAction>[]>(
    () => [
      {
        key: "status",
        label: LABELS.status,
        options: ACTION_STATUSES.map((status) => ({
          value: status,
          label: ACTION_STATUS_LABELS[status],
        })),
        value: (action) => action.status,
      },
      {
        key: "channel",
        label: LABELS.channel,
        options: ACTION_CHANNELS.map((channel) => ({
          value: channel,
          label: ACTION_CHANNEL_LABELS[channel],
        })),
        value: (action) => action.channel,
      },
      {
        key: "period",
        label: "Période",
        options: [
          { value: "7", label: "7 jours" },
          { value: "30", label: "30 jours" },
        ],
        // Autour d'aujourd'hui, passé ou à venir : une action À faire est future.
        value: (action) => {
          const days = calendarDaysBetween(now, action.occurredAt)
          return [days <= 7 ? "7" : null, days <= 30 ? "30" : null].filter(
            (period): period is string => period !== null,
          )
        },
      },
    ],
    [now],
  )

  const columns = useMemo<readonly Column<AdminProspectingAction>[]>(
    () => [
      ...buildDataColumns(view, ranks),
      actionsColumn<AdminProspectingAction>((action) => (
        <>
          {action.status === "A_FAIRE" ? <MarkActionDoneButton action={action} /> : null}
          <ProspectingActionFormDialog action={action} personOptions={personOptions} />
          <DeleteProspectingActionDialog action={action} />
        </>
      )),
    ],
    [view, ranks, personOptions],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedAction
        ? buildActionDetail(selectedAction, ranks.get(selectedAction.id) ?? 0, () => {
            setEditingAction(selectedAction)
          })
        : null,
    [selectedAction, ranks],
  )

  return (
    <>
      <DataTable
        rows={viewActions}
        columns={columns}
        getRowId={(action) => action.id}
        searchPlaceholder="Rechercher une action ou une personne"
        noun="action"
        onRowClick={setSelectedAction}
        rowLabel={(action) => action.title}
        facets={facets}
        empty={{
          icon: Send,
          title: "Aucune action",
          description: "Aucune action dans cette vue. Créez-en une via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedAction(null)
        }}
      />
      {editingAction ? (
        <ProspectingActionFormDialog
          key={editingAction.id}
          action={editingAction}
          personOptions={personOptions}
          open
          onOpenChange={(open) => {
            if (!open) setEditingAction(null)
          }}
        />
      ) : null}
    </>
  )
}
