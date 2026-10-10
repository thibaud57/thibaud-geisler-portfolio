"use client"

import { useMemo, useState, type ComponentProps } from "react"
import { Pencil, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import {
  type DetailContent,
  DetailDialog,
  type DetailSection,
} from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { RelatedLinksList, type RelatedLink } from "@/components/features/admin/RelatedLinksList"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import {
  actionsColumn,
  companyCell,
  hideableColumn,
  labelBadge,
  linkedinLink,
  truncatedCell,
} from "@/components/features/admin/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { DeleteLeadDialog } from "@/components/features/admin/leads/DeleteLeadDialog"
import { ErasePersonExchangesDialog } from "@/components/features/admin/persons/ErasePersonExchangesDialog"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import { rankActions } from "@/lib/action-rank"
import { byOccurredAtAsc } from "@/lib/action-views"
import {
  ADMIN_COMPANIES_PATH,
  ADMIN_CONTACTS_PATH,
  ADMIN_LEADS_PATH,
  ADMIN_OPPORTUNITIES_PATH,
  ADMIN_PROSPECTING_ACTIONS_PATH,
} from "@/lib/admin-routes"
import { LEAD_COLUMN_WIDTHS, LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS } from "@/lib/admin-table-widths"
import { CONTACT_STATUS_LABELS, CONTACT_TYPE_LABELS } from "@/lib/contacts"
import { formatShortDateTime, formatShortInstantDate } from "@/lib/date-time"
import { detailHref } from "@/lib/detail-links"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import {
  LEAD_DISPLAY_STATUS_ICONS,
  LEAD_DISPLAY_STATUS_LABELS,
  LEAD_DISPLAY_STATUSES,
  leadDisplayStatus,
} from "@/lib/lead-display-status"
import { leadsForView, type LeadView } from "@/lib/lead-views"
import {
  LEAD_CHANNEL_ICONS,
  LEAD_CHANNEL_LABELS,
  LEAD_FIELD_LABELS,
  LEAD_INTEREST_ICONS,
  LEAD_INTEREST_LABELS,
  LEAD_ORIGIN_ICONS,
  LEAD_ORIGIN_LABELS,
  LEAD_SECTION_TITLES,
} from "@/lib/leads"
import {
  OPTED_OUT_LABEL,
  PERSON_FIELD_LABELS,
  PERSON_SECTION_TITLES,
  personDisplayName,
} from "@/lib/persons"
import { toOpportunityLink } from "@/lib/opportunities"
import { isRetentionOver, retentionEndOf } from "@/lib/person-retention"
import { formatShortDate } from "@/lib/projects"
import { toActionLink } from "@/lib/prospecting-actions"
import { LEAD_INTERESTS, LEAD_ORIGINS } from "@/lib/schemas/lead"
import { STANDALONE_LINK_CLASS } from "@/lib/typography"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminLead } from "@/server/queries/leads"
import type { ActionTimelineRow } from "@/server/queries/prospecting-actions"

function interestBadge(lead: AdminLead) {
  if (!lead.interest) return null
  return (
    <EnumBadge
      label={LEAD_INTEREST_LABELS[lead.interest]}
      icon={LEAD_INTEREST_ICONS[lead.interest]}
    />
  )
}

function originBadge(lead: AdminLead) {
  return <EnumBadge label={LEAD_ORIGIN_LABELS[lead.origin]} icon={LEAD_ORIGIN_ICONS[lead.origin]} />
}

function channelBadge(lead: AdminLead) {
  if (!lead.channel) return null
  return (
    <EnumBadge label={LEAD_CHANNEL_LABELS[lead.channel]} icon={LEAD_CHANNEL_ICONS[lead.channel]} />
  )
}

function statusBadge(lead: AdminLead, badgeProps?: Omit<ComponentProps<typeof Badge>, "children">) {
  if (lead.optedOutAt) {
    return (
      <Badge variant="outline" {...badgeProps}>
        {OPTED_OUT_LABEL}
      </Badge>
    )
  }
  const displayStatus = leadDisplayStatus(lead)
  return (
    <EnumBadge
      label={LEAD_DISPLAY_STATUS_LABELS[displayStatus]}
      icon={LEAD_DISPLAY_STATUS_ICONS[displayStatus]}
      {...badgeProps}
    />
  )
}

// Une fiche en opposition ne se modifie ni ne se supprime : seul l'effacement des échanges lui reste.
function rowActions(lead: AdminLead) {
  if (lead.optedOutAt && lead.exchangesErasedAt) return null
  if (lead.optedOutAt) return <ErasePersonExchangesDialog person={lead} />
  return (
    <>
      <RowActionButton aria-label={`Modifier ${personDisplayName(lead)}`} asChild>
        <Link href={`${ADMIN_LEADS_PATH}/${lead.id}`}>
          <Pencil className="size-4" />
        </Link>
      </RowActionButton>
      <DeleteLeadDialog lead={lead} />
    </>
  )
}

function buildDataColumns(view: LeadView): readonly Column<AdminLead>[] {
  const visibleByDefault = LEAD_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  return [
    {
      key: "name",
      header: PERSON_FIELD_LABELS.name,
      width: LEAD_COLUMN_WIDTHS.name,
      sortValue: (lead) => personDisplayName(lead),
      searchValue: (lead) => `${personDisplayName(lead)} ${lead.company?.name ?? ""}`,
      cell: (lead) => (
        <TruncateTooltip className="block w-full font-medium">
          {personDisplayName(lead)}
        </TruncateTooltip>
      ),
    },
    {
      key: "status",
      header: LEAD_FIELD_LABELS.status,
      width: LEAD_COLUMN_WIDTHS.status,
      ...hideableColumn(visibleByDefault, "status"),
      cell: statusBadge,
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
      header: PERSON_FIELD_LABELS.metAt,
      width: LEAD_COLUMN_WIDTHS.metAt,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "metAt"),
      sortValue: (lead) => lead.metAt?.getTime() ?? 0,
      cell: (lead) => formatShortDate(lead.metAt),
    },
    {
      key: "jobRole",
      header: PERSON_FIELD_LABELS.jobRole,
      width: LEAD_COLUMN_WIDTHS.jobRole,
      ...hideableColumn(visibleByDefault, "jobRole"),
      cell: (lead) => labelBadge(lead.jobRole ? JOB_ROLE_LABELS[lead.jobRole] : null),
    },
    {
      key: "company",
      header: PERSON_FIELD_LABELS.companyId,
      width: LEAD_COLUMN_WIDTHS.company,
      ...hideableColumn(visibleByDefault, "company"),
      sortValue: (lead) => lead.company?.name ?? "",
      cell: companyCell,
    },
    {
      key: "zone",
      header: PERSON_FIELD_LABELS.zone,
      width: LEAD_COLUMN_WIDTHS.zone,
      ...hideableColumn(visibleByDefault, "zone"),
      cell: (lead) => labelBadge(lead.zone ? ZONE_LABELS[lead.zone] : null),
    },
    {
      key: "linkedinUrl",
      header: PERSON_FIELD_LABELS.linkedinUrl,
      width: LEAD_COLUMN_WIDTHS.linkedinUrl,
      ...hideableColumn(visibleByDefault, "linkedinUrl"),
      cell: (lead) =>
        lead.linkedinUrl ? (
          <TruncateTooltip className="block w-full">
            <ExternalUrl url={lead.linkedinUrl} />
          </TruncateTooltip>
        ) : null,
    },
    {
      key: "email",
      header: PERSON_FIELD_LABELS.email,
      width: LEAD_COLUMN_WIDTHS.email,
      ...hideableColumn(visibleByDefault, "email"),
      cell: (lead) => truncatedCell(lead.email),
    },
    {
      key: "phone",
      header: PERSON_FIELD_LABELS.phone,
      width: LEAD_COLUMN_WIDTHS.phone,
      className: "tabular-nums",
      ...hideableColumn(visibleByDefault, "phone"),
      cell: (lead) => truncatedCell(lead.phone),
    },
    {
      key: "actionsCount",
      header: "Relances",
      width: LEAD_COLUMN_WIDTHS.actionsCount,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "actionsCount"),
      sortValue: (lead) => lead.actionsCount,
      cell: (lead) => lead.actionsCount,
    },
    {
      key: "retentionEnd",
      header: "À conserver jusqu'au",
      width: LEAD_COLUMN_WIDTHS.retentionEnd,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "retentionEnd"),
      sortValue: (lead) => retentionEndOf(lead).getTime(),
      cell: (lead) => formatShortInstantDate(retentionEndOf(lead)),
    },
    {
      key: "notes",
      header: PERSON_FIELD_LABELS.notes,
      width: LEAD_COLUMN_WIDTHS.notes,
      className: "text-muted-foreground",
      ...hideableColumn(visibleByDefault, "notes"),
      cell: (lead) => truncatedCell(lead.notes),
    },
  ]
}

// L'historique se lit aussi pour un lead opposé : ses actions restent, sauf effacement demandé.
function historySection(
  history: readonly ActionTimelineRow[],
  ranks: Map<string, number>,
): DetailSection {
  return {
    title: LEAD_SECTION_TITLES.actions,
    rows: [
      {
        fullWidth: true,
        value:
          history.length === 0 ? null : (
            <RelatedLinksList
              links={history.map((action): RelatedLink => ({
                ...toActionLink(action, ranks.get(action.id) ?? 0),
                href: detailHref(ADMIN_PROSPECTING_ACTIONS_PATH, action.id),
              }))}
            />
          ),
      },
    ],
  }
}

function opportunitiesSection(lead: AdminLead): DetailSection {
  return {
    title: LEAD_SECTION_TITLES.opportunities,
    rows: [
      {
        fullWidth: true,
        value:
          lead.opportunities.length === 0 ? null : (
            <RelatedLinksList
              links={lead.opportunities.map((opportunity) =>
                toOpportunityLink(opportunity, {
                  href: detailHref(ADMIN_OPPORTUNITIES_PATH, opportunity.id),
                  metaSuffix: opportunity.client?.name,
                }),
              )}
            />
          ),
      },
    ],
  }
}

function buildLeadDetail(
  lead: AdminLead,
  history: readonly ActionTimelineRow[],
  ranks: Map<string, number>,
  onEdit: () => void,
): DetailContent {
  if (lead.optedOutAt) {
    return {
      title: personDisplayName(lead),
      status: statusBadge(lead, { variant: "outline", meta: true }),
      sections: [
        {
          title: PERSON_SECTION_TITLES.optOut,
          rows: [
            { label: PERSON_FIELD_LABELS.email, value: lead.email, fullWidth: true },
            { label: PERSON_FIELD_LABELS.linkedinUrl, value: linkedinLink(lead), fullWidth: true },
            { label: PERSON_FIELD_LABELS.optedOutAt, value: formatShortDate(lead.optedOutAt) },
            {
              label: PERSON_FIELD_LABELS.exchangesErasedAt,
              value: formatShortDate(lead.exchangesErasedAt),
            },
          ],
        },
        historySection(history, ranks),
        opportunitiesSection(lead),
      ],
    }
  }

  return {
    title: personDisplayName(lead),
    ...(lead.jobRole ? { subtitle: JOB_ROLE_LABELS[lead.jobRole] } : {}),
    status: statusBadge(lead, { variant: "outline", meta: true }),
    // Le poste est dans le sous-titre et le statut en tête : ni l'un ni l'autre n'a de ligne dans un bloc.
    sections: [
      {
        title: PERSON_SECTION_TITLES.person,
        rows: [
          {
            label: PERSON_FIELD_LABELS.companyId,
            value: lead.company ? (
              <Link
                href={detailHref(ADMIN_COMPANIES_PATH, lead.company.id)}
                className={STANDALONE_LINK_CLASS}
              >
                {lead.company.name}
              </Link>
            ) : null,
          },
          {
            label: PERSON_FIELD_LABELS.zone,
            value: labelBadge(lead.zone ? ZONE_LABELS[lead.zone] : null),
          },
        ],
      },
      {
        title: PERSON_SECTION_TITLES.contact,
        rows: [
          { label: PERSON_FIELD_LABELS.email, value: lead.email },
          { label: PERSON_FIELD_LABELS.phone, value: lead.phone },
          { label: PERSON_FIELD_LABELS.linkedinUrl, value: linkedinLink(lead), fullWidth: true },
        ],
      },
      {
        title: PERSON_SECTION_TITLES.details,
        rows: [
          {
            value: lead.details ? (
              <MarkdownContent markdown={lead.details} variant="admin" />
            ) : null,
            fullWidth: true,
          },
        ],
      },
      {
        title: LEAD_SECTION_TITLES.pipeline,
        rows: [
          // Statut est déjà dans l'en-tête : Intérêt passe en pleine largeur plutôt qu'à côté d'une case vide.
          { label: LEAD_FIELD_LABELS.interest, value: interestBadge(lead), fullWidth: true },
          { label: LEAD_FIELD_LABELS.origin, value: originBadge(lead) },
          { label: LEAD_FIELD_LABELS.channel, value: channelBadge(lead) },
          { label: PERSON_FIELD_LABELS.metAt, value: formatShortDate(lead.metAt) },
          {
            label: LEAD_FIELD_LABELS.score,
            value: lead.score === null ? null : `${lead.score} / 10`,
          },
          // Pleine largeur : metAt et Score restent la paire du formulaire, et la ligne ne reste pas à moitié vide.
          {
            label: LEAD_FIELD_LABELS.lastReplyAt,
            value: formatShortDateTime(lead.lastReplyAt),
            fullWidth: true,
          },
        ],
      },
      { title: PERSON_SECTION_TITLES.notes, rows: [{ value: lead.notes, fullWidth: true }] },
      {
        title: LEAD_SECTION_TITLES.network,
        rows: [
          {
            fullWidth: true,
            value: lead.contactRole ? (
              <RelatedLinksList
                links={[
                  {
                    id: lead.id,
                    href: detailHref(ADMIN_CONTACTS_PATH, lead.id),
                    label: "Fiche contact",
                    meta: [
                      lead.contactRole.types.length > 0
                        ? lead.contactRole.types.map((type) => CONTACT_TYPE_LABELS[type]).join(", ")
                        : "Sans type",
                      CONTACT_STATUS_LABELS[lead.contactRole.status],
                    ].join(" · "),
                  },
                ]}
              />
            ) : null,
          },
        ],
      },
      historySection(history, ranks),
      opportunitiesSection(lead),
    ],
    onEdit,
  }
}

const baseFacets: readonly Facet<AdminLead>[] = [
  {
    key: "status",
    label: LEAD_FIELD_LABELS.status,
    options: LEAD_DISPLAY_STATUSES.map((status) => ({
      value: status,
      label: LEAD_DISPLAY_STATUS_LABELS[status],
    })),
    // Une fiche en opposition affiche « Ne plus contacter » à la place du statut : un filtre sur le statut ne doit pas la lister.
    value: (lead) => (lead.optedOutAt ? [] : [leadDisplayStatus(lead)]),
  },
  {
    key: "interest",
    label: LEAD_FIELD_LABELS.interest,
    options: LEAD_INTERESTS.map((interest) => ({
      value: interest,
      label: LEAD_INTEREST_LABELS[interest],
    })),
    value: (lead) => (lead.interest ? [lead.interest] : []),
  },
  {
    key: "origin",
    label: LEAD_FIELD_LABELS.origin,
    options: LEAD_ORIGINS.map((origin) => ({ value: origin, label: LEAD_ORIGIN_LABELS[origin] })),
    value: (lead) => lead.origin,
  },
  {
    key: "jobRole",
    label: PERSON_FIELD_LABELS.jobRole,
    options: JOB_ROLES.map((role) => ({ value: role, label: JOB_ROLE_LABELS[role] })),
    value: (lead) => (lead.jobRole ? [lead.jobRole] : []),
  },
  {
    key: "zone",
    label: PERSON_FIELD_LABELS.zone,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (lead) => (lead.zone ? [lead.zone] : []),
  },
]

function retentionFacet(now: Date): Facet<AdminLead> {
  return {
    key: "retention",
    label: "Échéance",
    options: [{ value: "overdue", label: "Dépassée" }],
    value: (lead) => (isRetentionOver(lead, now) ? ["overdue"] : []),
  }
}

interface Props {
  leads: readonly AdminLead[]
  view: LeadView
  actions: readonly ActionTimelineRow[]
  initialDetailId?: string
}

export function LeadsTable({ leads, view, actions, initialDetailId }: Props) {
  const router = useRouter()
  const [selectedLead, setSelectedLead] = useState<AdminLead | null>(
    () => leads.find((lead) => lead.id === initialDetailId) ?? null,
  )
  // Instant figé au montage : le filtre d'échéance reste stable pendant la consultation.
  const [now] = useState(() => new Date())

  const viewLeads = useMemo(() => leadsForView(leads, view), [leads, view])
  const facets = useMemo(() => [...baseFacets, retentionFacet(now)], [now])
  const ranks = useMemo(() => rankActions(actions), [actions])
  const historyByPerson = useMemo(() => {
    const map = new Map<string, ActionTimelineRow[]>()
    for (const action of [...actions].sort(byOccurredAtAsc)) {
      const list = map.get(action.personId) ?? []
      list.push(action)
      map.set(action.personId, list)
    }
    return map
  }, [actions])

  const columns = useMemo<readonly Column<AdminLead>[]>(
    () => [...buildDataColumns(view), actionsColumn(rowActions)],
    [view],
  )

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedLead
        ? buildLeadDetail(selectedLead, historyByPerson.get(selectedLead.id) ?? [], ranks, () => {
            router.push(`${ADMIN_LEADS_PATH}/${selectedLead.id}`)
          })
        : null,
    [selectedLead, historyByPerson, ranks, router],
  )

  return (
    <>
      <DataTable
        rows={viewLeads}
        columns={columns}
        getRowId={(lead) => lead.id}
        searchPlaceholder="Rechercher un nom ou une entreprise"
        noun="lead"
        onRowClick={setSelectedLead}
        rowLabel={personDisplayName}
        facets={facets}
        empty={{
          icon: UserPlus,
          title: "Aucun lead",
          description: "Aucun lead dans cette vue. Créez-en un via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedLead(null)
        }}
      />
    </>
  )
}
