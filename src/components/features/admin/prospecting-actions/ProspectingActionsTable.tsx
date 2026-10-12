"use client"

import { useMemo, useState } from "react"
import { Send } from "lucide-react"

import { DataTable, type Column, type Facet } from "@/components/features/admin/table/DataTable"
import {
  actionsColumn,
  enumBadge,
  enumFacet,
  hideableColumn,
} from "@/components/features/admin/table/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { ActionRowActions } from "@/components/features/admin/prospecting-actions/ActionRowActions"
import {
  channelBadge,
  personCell,
} from "@/components/features/admin/prospecting-actions/action-detail"
import { useProspectingActionDetail } from "@/components/features/admin/prospecting-actions/useProspectingActionDetail"
import { BOARD_PERIOD_LABELS, type BoardPeriod } from "@/lib/crm/action-board"
import { ACTION_VIEW_LOCKED_FACETS, actionsForView, type ActionView } from "@/lib/crm/action-views"
import { ACTION_COLUMN_WIDTHS, ACTION_VIEW_DEFAULT_VISIBLE_COLUMNS } from "@/lib/admin/table-widths"
import { formatShortDateTime, isWithinCalendarDays } from "@/lib/date-time"
import { personDisplayName } from "@/lib/crm/persons"
import {
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
} from "@/lib/crm/prospecting-actions"
import { ACTION_CHANNELS, ACTION_STATUSES } from "@/lib/schemas/prospecting-action"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

function buildDataColumns(view: ActionView): readonly Column<AdminProspectingAction>[] {
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
      cell: (action) => enumBadge(action.status, ACTION_STATUS_LABELS, ACTION_STATUS_ICONS),
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

const PERIOD_FACET_VALUES = ["7", "30"] as const satisfies readonly BoardPeriod[]

interface Props {
  actions: readonly AdminProspectingAction[]
  view: ActionView
  personOptions: readonly PersonOption[]
  initialDetailId?: string
}

export function ProspectingActionsTable({ actions, view, personOptions, initialDetailId }: Props) {
  // Instant figé au montage : le filtre Période reste stable pendant la consultation.
  const [now] = useState(() => new Date())

  const { openDetail, dialogs } = useProspectingActionDetail({
    actions,
    personOptions,
    initialDetailId,
  })
  const viewActions = useMemo(() => actionsForView(actions, view), [actions, view])

  const facets = useMemo<readonly Facet<AdminProspectingAction>[]>(
    () => [
      enumFacet(
        "status",
        LABELS.status,
        ACTION_STATUSES,
        ACTION_STATUS_LABELS,
        (action) => action.status,
      ),
      enumFacet(
        "channel",
        LABELS.channel,
        ACTION_CHANNELS,
        ACTION_CHANNEL_LABELS,
        (action) => action.channel,
      ),
      // Autour d'aujourd'hui, passé ou à venir : une action À faire est future.
      enumFacet("period", LABELS.period, PERIOD_FACET_VALUES, BOARD_PERIOD_LABELS, (action) =>
        PERIOD_FACET_VALUES.filter((period) =>
          isWithinCalendarDays(now, action.occurredAt, Number(period)),
        ),
      ),
    ],
    [now],
  )

  const columns = useMemo<readonly Column<AdminProspectingAction>[]>(
    () => [
      ...buildDataColumns(view),
      actionsColumn<AdminProspectingAction>((action) => (
        <ActionRowActions action={action} personOptions={personOptions} />
      )),
    ],
    [view, personOptions],
  )

  return (
    <>
      <DataTable
        rows={viewActions}
        columns={columns}
        getRowId={(action) => action.id}
        searchPlaceholder="Rechercher une action ou une personne"
        noun="action"
        onRowClick={openDetail}
        rowLabel={(action) => action.title}
        facets={facets}
        lockedFacets={ACTION_VIEW_LOCKED_FACETS[view]}
        empty={{
          icon: Send,
          title: "Aucune action",
          description: "Aucune action dans cette vue. Créez-en une via le bouton ci-dessus.",
        }}
      />
      {dialogs}
    </>
  )
}
