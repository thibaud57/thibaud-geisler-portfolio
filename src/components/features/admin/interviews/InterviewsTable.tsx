"use client"

import { useCallback, useMemo } from "react"
import { MessageCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import { BadgeList } from "@/components/features/admin/BadgeList"
import { DataTable, type Column, type Facet } from "@/components/features/admin/table/DataTable"
import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import {
  linksSection,
  markdownSection,
  textSection,
} from "@/components/features/admin/detail/detail-sections"
import { EditRowLink } from "@/components/features/admin/table/EditRowLink"
import { DeleteInterviewDialog } from "@/components/features/admin/interviews/DeleteInterviewDialog"
import {
  actionsColumn,
  companyCell,
  contractBadge,
  enumBadge,
  enumFacet,
  hideableColumn,
  PersonLink,
  truncatedCell,
  workModeBadge,
  zoneBadge,
} from "@/components/features/admin/table/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { useRowDetail } from "@/hooks/use-row-detail"
import { ADMIN_INTERVIEWS_PATH, ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import {
  INTERVIEW_COLUMN_WIDTHS,
  INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS,
} from "@/lib/admin/table-widths"
import { formatShortDateTime } from "@/lib/date-time"
import { detailHref } from "@/lib/admin/detail-links"
import {
  INTERVIEW_VIEW_LOCKED_FACETS,
  interviewsForView,
  type InterviewView,
} from "@/lib/crm/interview-views"
import {
  INTERVIEW_DECISION_ICONS,
  INTERVIEW_DECISION_LABELS,
  INTERVIEW_FIELD_LABELS as LABELS,
  INTERVIEW_FORMAT_ICONS,
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_OUTCOME_ICONS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_SECTION_TITLES,
  INTERVIEW_STATUS_ICONS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_ICONS,
  INTERVIEW_TYPE_LABELS,
  type InterviewPlace,
  interviewPlaces,
  interviewTitleOf,
  toInterviewLink,
} from "@/lib/crm/interviews"
import {
  formatDailyRate,
  OPPORTUNITY_FIELD_LABELS,
  OPPORTUNITY_SECTION_TITLES,
  OPPORTUNITY_STATUS_LABELS,
} from "@/lib/crm/opportunities"
import { personDisplayName } from "@/lib/crm/persons"
import {
  INTERVIEW_FORMATS,
  INTERVIEW_OUTCOMES,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPES,
} from "@/lib/schemas/interview"
import type { AdminInterview } from "@/server/queries/interviews"

function leadingCompany(interview: AdminInterview) {
  return interview.side === "ESN"
    ? interview.opportunity.intermediary
    : interview.opportunity.client
}

function correspondentNames(interview: AdminInterview): string[] {
  return interview.correspondents.map((person) => personDisplayName(person))
}

function typeBadge(interview: AdminInterview) {
  return enumBadge(interview.type, INTERVIEW_TYPE_LABELS, INTERVIEW_TYPE_ICONS)
}

function formatBadge(interview: AdminInterview) {
  return enumBadge(interview.format, INTERVIEW_FORMAT_LABELS, INTERVIEW_FORMAT_ICONS)
}

function outcomeBadge(interview: AdminInterview) {
  return enumBadge(interview.outcome, INTERVIEW_OUTCOME_LABELS, INTERVIEW_OUTCOME_ICONS)
}

function decisionBadge(interview: AdminInterview) {
  return enumBadge(interview.decision, INTERVIEW_DECISION_LABELS, INTERVIEW_DECISION_ICONS)
}

function buildDataColumns(
  titles: ReadonlyMap<string, string>,
  view: InterviewView,
): readonly Column<AdminInterview>[] {
  const visibleByDefault = INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS[view]
  return [
    {
      key: "title",
      header: "Entretien",
      width: INTERVIEW_COLUMN_WIDTHS.title,
      sortValue: (interview) => titles.get(interview.id) ?? "",
      searchValue: (interview) =>
        [
          titles.get(interview.id) ?? "",
          interview.opportunity.title,
          leadingCompany(interview)?.name ?? "",
          ...correspondentNames(interview),
        ].join(" "),
      cell: (interview) => (
        <TruncateTooltip className="block w-full font-medium">
          {titles.get(interview.id) ?? ""}
        </TruncateTooltip>
      ),
    },
    {
      key: "opportunity",
      header: LABELS.opportunityId,
      width: INTERVIEW_COLUMN_WIDTHS.opportunity,
      ...hideableColumn(visibleByDefault, "opportunity"),
      sortValue: (interview) => interview.opportunity.title,
      cell: (interview) => truncatedCell(interview.opportunity.title),
    },
    {
      key: "side",
      header: LABELS.side,
      width: INTERVIEW_COLUMN_WIDTHS.side,
      ...hideableColumn(visibleByDefault, "side"),
      sortValue: (interview) => leadingCompany(interview)?.name ?? "",
      cell: (interview) => companyCell({ company: leadingCompany(interview) }),
    },
    {
      key: "scheduledAt",
      header: LABELS.scheduledAt,
      width: INTERVIEW_COLUMN_WIDTHS.scheduledAt,
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "scheduledAt"),
      sortValue: (interview) => interview.scheduledAt.getTime(),
      cell: (interview) => formatShortDateTime(interview.scheduledAt),
    },
    {
      key: "type",
      header: LABELS.type,
      width: INTERVIEW_COLUMN_WIDTHS.type,
      ...hideableColumn(visibleByDefault, "type"),
      cell: typeBadge,
    },
    {
      key: "format",
      header: LABELS.format,
      width: INTERVIEW_COLUMN_WIDTHS.format,
      ...hideableColumn(visibleByDefault, "format"),
      cell: formatBadge,
    },
    {
      key: "status",
      header: LABELS.status,
      width: INTERVIEW_COLUMN_WIDTHS.status,
      ...hideableColumn(visibleByDefault, "status"),
      cell: (interview) =>
        enumBadge(interview.status, INTERVIEW_STATUS_LABELS, INTERVIEW_STATUS_ICONS),
    },
    {
      key: "outcome",
      header: LABELS.outcome,
      width: INTERVIEW_COLUMN_WIDTHS.outcome,
      ...hideableColumn(visibleByDefault, "outcome"),
      cell: outcomeBadge,
    },
    {
      key: "zone",
      header: OPPORTUNITY_FIELD_LABELS.zone,
      width: INTERVIEW_COLUMN_WIDTHS.zone,
      ...hideableColumn(visibleByDefault, "zone"),
      cell: (interview) => zoneBadge(interview.opportunity),
    },
    {
      key: "workMode",
      wrapHeader: true,
      header: OPPORTUNITY_FIELD_LABELS.workMode,
      width: INTERVIEW_COLUMN_WIDTHS.workMode,
      ...hideableColumn(visibleByDefault, "workMode"),
      cell: (interview) => workModeBadge(interview.opportunity),
    },
    {
      key: "dailyRate",
      header: OPPORTUNITY_FIELD_LABELS.dailyRate,
      width: INTERVIEW_COLUMN_WIDTHS.dailyRate,
      align: "right",
      className: "tabular-nums",
      ...hideableColumn(visibleByDefault, "dailyRate"),
      sortValue: (interview) => interview.opportunity.dailyRate ?? -1,
      cell: (interview) => formatDailyRate(interview.opportunity.dailyRate),
    },
    {
      key: "score",
      header: LABELS.score,
      width: INTERVIEW_COLUMN_WIDTHS.score,
      align: "right",
      className: "tabular-nums text-muted-foreground",
      ...hideableColumn(visibleByDefault, "score"),
      sortValue: (interview) => interview.score ?? -1,
      cell: (interview) => interview.score,
    },
    {
      key: "decision",
      wrapHeader: true,
      header: LABELS.decision,
      width: INTERVIEW_COLUMN_WIDTHS.decision,
      ...hideableColumn(visibleByDefault, "decision"),
      cell: decisionBadge,
    },
    {
      key: "correspondents",
      header: LABELS.correspondentIds,
      width: INTERVIEW_COLUMN_WIDTHS.correspondents,
      ...hideableColumn(visibleByDefault, "correspondents"),
      cell: (interview) =>
        interview.correspondents.length > 0 ? (
          <BadgeList labels={correspondentNames(interview)} noun="correspondants" />
        ) : null,
    },
  ]
}

function rowActions(interview: AdminInterview, fullTitle: string) {
  return (
    <>
      <EditRowLink
        href={`${ADMIN_INTERVIEWS_PATH}/${interview.id}`}
        label={`Modifier ${fullTitle}`}
      />
      <DeleteInterviewDialog interviewId={interview.id} name={fullTitle} />
    </>
  )
}

function correspondentsValue(interview: AdminInterview) {
  if (interview.correspondents.length === 0) return null
  return (
    <span className="flex flex-wrap gap-2">
      {interview.correspondents.map((person) => (
        <PersonLink key={person.id} person={person} />
      ))}
    </span>
  )
}

function opportunityLink(interview: AdminInterview) {
  const { opportunity } = interview
  const company = leadingCompany(interview)
  return {
    id: opportunity.id,
    href: detailHref(ADMIN_OPPORTUNITIES_PATH, opportunity.id),
    label: opportunity.title,
    meta: [OPPORTUNITY_STATUS_LABELS[opportunity.status], company?.name]
      .filter(Boolean)
      .join(" · "),
  }
}

function buildInterviewDetail(
  interview: AdminInterview,
  titles: ReadonlyMap<string, string>,
  places: ReadonlyMap<string, InterviewPlace>,
  previous: AdminInterview | null,
  onEdit: () => void,
  onOpenPrevious: (() => void) | undefined,
): DetailContent {
  const { opportunity } = interview

  return {
    title: titles.get(interview.id) ?? "",
    badges: [headerBadge(interview.status, INTERVIEW_STATUS_LABELS, INTERVIEW_STATUS_ICONS)],
    sections: [
      {
        title: INTERVIEW_SECTION_TITLES.exchange,
        rows: [
          { label: LABELS.type, value: typeBadge(interview) },
          { label: LABELS.format, value: formatBadge(interview) },
          { label: LABELS.scheduledAt, value: formatShortDateTime(interview.scheduledAt) },
          { label: LABELS.side, value: companyCell({ company: leadingCompany(interview) }) },
          { label: LABELS.correspondentIds, value: correspondentsValue(interview) },
        ],
      },
      // Conditions de l'opportunité, sans champ dans le formulaire de l'entretien : lues pour préparer l'échange.
      {
        title: OPPORTUNITY_SECTION_TITLES.conditions,
        rows: [
          {
            label: OPPORTUNITY_FIELD_LABELS.dailyRate,
            value: formatDailyRate(opportunity.dailyRate),
          },
          { label: OPPORTUNITY_FIELD_LABELS.contract, value: contractBadge(opportunity) },
          { label: OPPORTUNITY_FIELD_LABELS.workMode, value: workModeBadge(opportunity) },
          { label: OPPORTUNITY_FIELD_LABELS.zone, value: zoneBadge(opportunity) },
        ],
      },
      {
        title: INTERVIEW_SECTION_TITLES.evaluation,
        rows: [
          { label: LABELS.outcome, value: outcomeBadge(interview) },
          {
            label: LABELS.score,
            value: interview.score === null ? null : `${interview.score} / 10`,
          },
          { label: LABELS.decision, value: decisionBadge(interview) },
        ],
      },
      textSection(LABELS.notes, interview.notes),
      markdownSection(LABELS.details, interview.details),
      linksSection(OPPORTUNITY_SECTION_TITLES.opportunity, [opportunityLink(interview)]),
      linksSection(
        INTERVIEW_SECTION_TITLES.previous,
        previous
          ? [
              {
                ...toInterviewLink(
                  previous,
                  places,
                  detailHref(ADMIN_INTERVIEWS_PATH, previous.id),
                ),
                onClick: onOpenPrevious,
              },
            ]
          : [],
      ),
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminInterview>[] = [
  enumFacet(
    "type",
    LABELS.type,
    INTERVIEW_TYPES,
    INTERVIEW_TYPE_LABELS,
    (interview) => interview.type,
  ),
  enumFacet(
    "format",
    LABELS.format,
    INTERVIEW_FORMATS,
    INTERVIEW_FORMAT_LABELS,
    (interview) => interview.format,
  ),
  enumFacet(
    "status",
    LABELS.status,
    INTERVIEW_STATUSES,
    INTERVIEW_STATUS_LABELS,
    (interview) => interview.status,
  ),
  enumFacet(
    "outcome",
    LABELS.outcome,
    INTERVIEW_OUTCOMES,
    INTERVIEW_OUTCOME_LABELS,
    (interview) => interview.outcome,
  ),
]

interface Props {
  interviews: readonly AdminInterview[]
  view: InterviewView
  initialDetailId?: string
}

export function InterviewsTable({ interviews, view, initialDetailId }: Props) {
  const router = useRouter()
  // Titres calculés sur tous les entretiens, jamais sur la seule vue : « Entretien 2 » le reste même si l'entretien 1 n'y figure pas.
  const places = useMemo(() => interviewPlaces(interviews), [interviews])
  const titles = useMemo(
    () =>
      new Map(interviews.map((interview) => [interview.id, interviewTitleOf(interview, places)])),
    [interviews, places],
  )
  const viewInterviews = useMemo(() => interviewsForView(interviews, view), [interviews, view])

  const columns = useMemo<readonly Column<AdminInterview>[]>(
    () => [
      ...buildDataColumns(titles, view),
      actionsColumn((interview: AdminInterview) =>
        rowActions(interview, interviewTitleOf(interview, places, { withOpportunity: true })),
      ),
    ],
    [titles, places, view],
  )

  const build = useCallback(
    (interview: AdminInterview, open: (row: AdminInterview) => void) => {
      const previousId = places.get(interview.id)?.previousId
      const previous = interviews.find((candidate) => candidate.id === previousId) ?? null
      // Dans le Journal le lien garde la même route : la table reste montée, la sélection change donc ici. Depuis À venir, le href mène au Journal.
      const onOpenPrevious =
        previous && view === "journal"
          ? () => {
              open(previous)
            }
          : undefined
      return buildInterviewDetail(
        interview,
        titles,
        places,
        previous,
        () => {
          router.push(`${ADMIN_INTERVIEWS_PATH}/${interview.id}`)
        },
        onOpenPrevious,
      )
    },
    [places, interviews, titles, router, view],
  )
  const { open, dialog } = useRowDetail({ rows: interviews, initialDetailId, build })

  return (
    <>
      <DataTable
        rows={viewInterviews}
        columns={columns}
        getRowId={(interview) => interview.id}
        searchPlaceholder="Rechercher une opportunité, une entreprise ou un correspondant"
        noun="entretien"
        onRowClick={open}
        rowLabel={(interview) => titles.get(interview.id) ?? ""}
        facets={facets}
        lockedFacets={INTERVIEW_VIEW_LOCKED_FACETS[view]}
        empty={{
          icon: MessageCircle,
          title: "Aucun entretien",
          description: "Aucun entretien dans cette vue. Créez-en un via le bouton ci-dessus.",
        }}
      />
      {dialog}
    </>
  )
}
