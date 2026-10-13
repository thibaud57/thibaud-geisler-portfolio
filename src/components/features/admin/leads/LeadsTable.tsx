"use client"

import { useCallback, useMemo, useState } from "react"
import { UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"
import { DataTable, type Column } from "@/components/features/admin/table/DataTable"
import { EditRowLink } from "@/components/features/admin/table/EditRowLink"
import {
  actionsColumn,
  enumFacet,
  hideableColumn,
} from "@/components/features/admin/table/table-cells"
import { enumBadge, labelBadge } from "@/components/features/admin/display/badges"
import { DeleteLeadDialog } from "@/components/features/admin/leads/DeleteLeadDialog"
import { ErasePersonExchangesDialog } from "@/components/features/admin/persons/ErasePersonExchangesDialog"
import { personColumns, personFacets } from "@/components/features/admin/persons/person-table"
import { useSignalDetail } from "@/components/features/admin/signals/use-signal-detail"
import { Badge } from "@/components/ui/badge"
import type { Facet } from "@/lib/admin/facets"
import { useRowDetail } from "@/components/features/admin/detail/use-row-detail"
import { groupByPersonRecentFirst } from "@/lib/crm/action-views"
import { ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import {
  LEAD_COLUMN_WIDTHS,
  LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS,
} from "@/components/features/admin/leads/lead-table-widths"
import { formatDateOnly, formatShortInstantDate } from "@/lib/date-time"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/crm/job-roles"
import {
  LEAD_DISPLAY_STATUS_ICONS,
  LEAD_DISPLAY_STATUS_LABELS,
  LEAD_DISPLAY_STATUSES,
  leadDisplayStatus,
} from "@/lib/crm/lead-display-status"
import { LEAD_VIEW_LOCKED_FACETS, leadsForView, type LeadView } from "@/lib/crm/lead-views"
import {
  LEAD_FIELD_LABELS,
  LEAD_INTEREST_LABELS,
  LEAD_ORIGIN_LABELS,
  LEAD_SECTION_TITLES,
} from "@/lib/crm/leads"
import { OPTED_OUT_LABEL, PERSON_FIELD_LABELS, personDisplayName } from "@/lib/crm/persons"
import { isOptOutOver, isRetentionOver, retentionEndOf } from "@/lib/crm/person-retention"
import { LEAD_INTERESTS, LEAD_ORIGINS } from "@/lib/schemas/lead"
import { signalFacet } from "@/lib/crm/signals"
import type { AdminLead } from "@/server/queries/leads"
import type { ActionTimelineRow } from "@/server/queries/prospecting-actions"
import {
  buildLeadDetail,
  channelBadge,
  interestBadge,
  originBadge,
} from "@/components/features/admin/leads/lead-detail"

function statusBadge(lead: AdminLead, now: number) {
  if (lead.optedOutAt) return <Badge variant="outline">{OPTED_OUT_LABEL}</Badge>
  return enumBadge(
    leadDisplayStatus(lead, now),
    LEAD_DISPLAY_STATUS_LABELS,
    LEAD_DISPLAY_STATUS_ICONS,
  )
}

// Une fiche en opposition ne se modifie pas : l'effacement des échanges lui reste, puis la suppression au terme de ses 3 ans.
function rowActions(lead: AdminLead, now: Date) {
  if (lead.optedOutAt && isOptOutOver(lead.optedOutAt, now)) return <DeleteLeadDialog lead={lead} />
  if (lead.optedOutAt && lead.exchangesErasedAt) return null
  if (lead.optedOutAt) return <ErasePersonExchangesDialog person={lead} />
  return (
    <>
      <EditRowLink
        href={`${ADMIN_LEADS_PATH}/${lead.id}`}
        label={`Modifier ${personDisplayName(lead)}`}
      />
      <DeleteLeadDialog lead={lead} />
    </>
  )
}

function buildDataColumns(view: LeadView, now: number): readonly Column<AdminLead>[] {
  const visibleByDefault = LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  const person = personColumns<AdminLead>(LEAD_COLUMN_WIDTHS, visibleByDefault)
  return [
    person.name,
    {
      key: "status",
      header: LEAD_FIELD_LABELS.status,
      width: LEAD_COLUMN_WIDTHS.status,
      ...hideableColumn(visibleByDefault, "status"),
      cell: (lead) => statusBadge(lead, now),
    },
    {
      key: "interest",
      header: LEAD_FIELD_LABELS.interest,
      width: LEAD_COLUMN_WIDTHS.interest,
      ...hideableColumn(visibleByDefault, "interest"),
      cell: interestBadge,
    },
    {
      key: "score",
      header: LEAD_FIELD_LABELS.score,
      width: LEAD_COLUMN_WIDTHS.score,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "score"),
      sortValue: (lead) => lead.score ?? -1,
      cell: (lead) => lead.score,
    },
    {
      key: "origin",
      header: LEAD_FIELD_LABELS.origin,
      width: LEAD_COLUMN_WIDTHS.origin,
      ...hideableColumn(visibleByDefault, "origin"),
      cell: originBadge,
    },
    {
      key: "channel",
      header: LEAD_FIELD_LABELS.channel,
      width: LEAD_COLUMN_WIDTHS.channel,
      ...hideableColumn(visibleByDefault, "channel"),
      cell: channelBadge,
    },
    {
      key: "metAt",
      wrapHeader: true,
      header: PERSON_FIELD_LABELS.metAt,
      width: LEAD_COLUMN_WIDTHS.metAt,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "metAt"),
      sortValue: (lead) => lead.metAt?.getTime() ?? 0,
      cell: (lead) => (lead.metAt ? formatDateOnly(lead.metAt) : null),
    },
    {
      key: "jobRole",
      header: PERSON_FIELD_LABELS.jobRole,
      width: LEAD_COLUMN_WIDTHS.jobRole,
      ...hideableColumn(visibleByDefault, "jobRole"),
      cell: (lead) => labelBadge(lead.jobRole ? JOB_ROLE_LABELS[lead.jobRole] : null),
    },
    person.zone,
    person.linkedinUrl,
    person.email,
    person.phone,
    {
      key: "actionsCount",
      header: LEAD_SECTION_TITLES.actions,
      width: LEAD_COLUMN_WIDTHS.actionsCount,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "actionsCount"),
      sortValue: (lead) => lead.actionsCount,
      cell: (lead) => lead.actionsCount,
    },
    {
      key: "interviewsCount",
      header: LEAD_SECTION_TITLES.interviews,
      width: LEAD_COLUMN_WIDTHS.interviewsCount,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "interviewsCount"),
      sortValue: (lead) => lead.interviews.length,
      cell: (lead) => lead.interviews.length,
    },
    {
      key: "retentionEnd",
      wrapHeader: true,
      header: LEAD_FIELD_LABELS.retentionEnd,
      width: LEAD_COLUMN_WIDTHS.retentionEnd,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "retentionEnd"),
      sortValue: (lead) => retentionEndOf(lead).getTime(),
      cell: (lead) => formatShortInstantDate(retentionEndOf(lead)),
    },
    person.notes,
  ]
}

function statusFacet(now: number): Facet<AdminLead> {
  return enumFacet(
    "status",
    LEAD_FIELD_LABELS.status,
    LEAD_DISPLAY_STATUSES,
    LEAD_DISPLAY_STATUS_LABELS,
    // Une fiche en opposition affiche « Ne plus contacter » à la place du statut : un filtre sur le statut ne doit pas la lister.
    (lead) => (lead.optedOutAt ? null : leadDisplayStatus(lead, now)),
  )
}

const baseFacets: readonly Facet<AdminLead>[] = [
  enumFacet(
    "interest",
    LEAD_FIELD_LABELS.interest,
    LEAD_INTERESTS,
    LEAD_INTEREST_LABELS,
    (lead) => lead.interest,
  ),
  enumFacet(
    "origin",
    LEAD_FIELD_LABELS.origin,
    LEAD_ORIGINS,
    LEAD_ORIGIN_LABELS,
    (lead) => lead.origin,
  ),
  enumFacet(
    "jobRole",
    PERSON_FIELD_LABELS.jobRole,
    JOB_ROLES,
    JOB_ROLE_LABELS,
    (lead) => lead.jobRole,
  ),
]

interface Props {
  leads: readonly AdminLead[]
  view: LeadView
  actions: readonly ActionTimelineRow[]
  initialDetailId?: string
}

export function LeadsTable({ leads, view, actions, initialDetailId }: Props) {
  const router = useRouter()
  // Instant figé au montage : les filtres d'échéance et de signal et la fraîcheur restent stables pendant la consultation.
  const [now] = useState(() => new Date())
  const nowMs = now.getTime()
  const { openSignal, detailFor, reset, formDialog } = useSignalDetail(now)

  const viewLeads = useMemo(() => leadsForView(leads, view, nowMs), [leads, view, nowMs])
  const facets = useMemo(() => {
    const { zone, overdue } = personFacets<AdminLead>((lead) => isRetentionOver(lead, now))
    return [statusFacet(nowMs), ...baseFacets, zone, overdue, signalFacet<AdminLead>(now)]
  }, [nowMs, now])
  const historyByPerson = useMemo(() => groupByPersonRecentFirst(actions), [actions])

  const columns = useMemo<readonly Column<AdminLead>[]>(
    () => [
      ...buildDataColumns(view, nowMs),
      actionsColumn((lead: AdminLead) => rowActions(lead, now)),
    ],
    [view, now, nowMs],
  )

  const buildDetail = useCallback(
    (lead: AdminLead) =>
      detailFor({ kind: "lead", id: lead.id, name: personDisplayName(lead) }) ??
      buildLeadDetail(
        lead,
        historyByPerson.get(lead.id) ?? [],
        () => {
          router.push(`${ADMIN_LEADS_PATH}/${lead.id}`)
        },
        now,
        openSignal,
      ),
    [detailFor, historyByPerson, router, now, openSignal],
  )

  // Toute la liste et non la vue : le lead ouvert par `?detail=` peut appartenir à une autre vue.
  const { open, dialog } = useRowDetail({
    rows: leads,
    initialDetailId,
    build: buildDetail,
    onClose: reset,
  })

  return (
    <>
      <DataTable
        rows={viewLeads}
        columns={columns}
        getRowId={(lead) => lead.id}
        searchPlaceholder="Rechercher un nom ou une entreprise"
        noun="lead"
        onRowClick={(lead) => {
          reset()
          open(lead)
        }}
        rowLabel={personDisplayName}
        facets={facets}
        lockedFacets={LEAD_VIEW_LOCKED_FACETS[view]}
        empty={{
          icon: UserPlus,
          title: "Aucun lead",
          description: "Aucun lead dans cette vue. Créez-en un via le bouton ci-dessus.",
        }}
      />
      {dialog}
      {formDialog}
    </>
  )
}
