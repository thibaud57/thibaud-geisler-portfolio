"use client"

import { useMemo, useState, type ComponentProps } from "react"
import { MessageCircle, Pencil } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { BadgeList } from "@/components/features/admin/BadgeList"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { RelatedLinksList } from "@/components/features/admin/RelatedLinksList"
import { DeleteInterviewDialog } from "@/components/features/admin/entretiens/DeleteInterviewDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import {
  actionsColumn,
  companyCell,
  contractBadge,
  enumBadge,
  hideableColumn,
  truncatedCell,
  workModeBadge,
  zoneBadge,
} from "@/components/features/admin/table-cells"
import { TruncateTooltip } from "@/components/features/admin/TruncateTooltip"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import { ADMIN_INTERVIEWS_PATH, ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin-routes"
import {
  INTERVIEW_COLUMN_WIDTHS,
  INTERVIEW_VIEW_DEFAULT_VISIBLE_COLUMNS,
} from "@/lib/admin-table-widths"
import { formatShortDateTime } from "@/lib/date-time"
import { detailHref } from "@/lib/detail-links"
import { interviewsForView, type InterviewView } from "@/lib/interview-views"
import {
  INTERVIEW_DECISION_ICONS,
  INTERVIEW_DECISION_LABELS,
  INTERVIEW_FIELD_LABELS as LABELS,
  INTERVIEW_OUTCOME_ICONS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_STATUS_ICONS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_ICONS,
  INTERVIEW_TYPE_LABELS,
  type InterviewPlace,
  interviewPlaces,
  interviewTitle,
  toInterviewLink,
} from "@/lib/interviews"
import {
  formatDailyRate,
  OPPORTUNITY_FIELD_LABELS,
  OPPORTUNITY_SECTION_TITLES,
  OPPORTUNITY_STATUS_LABELS,
} from "@/lib/opportunities"
import { personDetailHref } from "@/lib/person-links"
import { OPTED_OUT_LABEL, personDisplayName } from "@/lib/persons"
import { INTERVIEW_OUTCOMES, INTERVIEW_STATUSES, INTERVIEW_TYPES } from "@/lib/schemas/interview"
import { STANDALONE_LINK_CLASS } from "@/lib/typography"
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

function statusBadge(
  interview: Pick<AdminInterview, "status">,
  badgeProps?: Omit<ComponentProps<typeof Badge>, "children">,
) {
  return (
    <EnumBadge
      label={INTERVIEW_STATUS_LABELS[interview.status]}
      icon={INTERVIEW_STATUS_ICONS[interview.status]}
      {...badgeProps}
    />
  )
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
      key: "status",
      header: LABELS.status,
      width: INTERVIEW_COLUMN_WIDTHS.status,
      ...hideableColumn(visibleByDefault, "status"),
      cell: (interview) => statusBadge(interview),
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

function rowActions(interview: AdminInterview, title: string) {
  return (
    <>
      <RowActionButton aria-label={`Modifier ${title} · ${interview.opportunity.title}`} asChild>
        <Link href={`${ADMIN_INTERVIEWS_PATH}/${interview.id}`}>
          <Pencil className="size-4" />
        </Link>
      </RowActionButton>
      <DeleteInterviewDialog interview={interview} title={title} />
    </>
  )
}

function correspondentsValue(interview: AdminInterview) {
  if (interview.correspondents.length === 0) return null
  return (
    <span className="flex flex-wrap gap-2">
      {interview.correspondents.map((person) => {
        // Un correspondant peut avoir perdu ses rôles Lead et Contact : sans fiche à ouvrir, son nom reste en texte simple.
        const href = personDetailHref(person)
        const name = personDisplayName(person)
        return (
          <span key={person.id} className="inline-flex items-center gap-1">
            {href ? (
              <Link href={href} className={STANDALONE_LINK_CLASS}>
                {name}
              </Link>
            ) : (
              <span>{name}</span>
            )}
            {person.optedOutAt ? <Badge variant="outline">{OPTED_OUT_LABEL}</Badge> : null}
          </span>
        )
      })}
    </span>
  )
}

function opportunityValue(interview: AdminInterview) {
  const { opportunity } = interview
  const company = leadingCompany(interview)
  return (
    <RelatedLinksList
      links={[
        {
          id: opportunity.id,
          href: detailHref(ADMIN_OPPORTUNITIES_PATH, opportunity.id),
          label: opportunity.title,
          meta: [OPPORTUNITY_STATUS_LABELS[opportunity.status], company?.name]
            .filter(Boolean)
            .join(" · "),
        },
      ]}
    />
  )
}

function previousValue(
  previous: AdminInterview | null,
  places: ReadonlyMap<string, InterviewPlace>,
  onOpen: (() => void) | undefined,
) {
  if (!previous) return null
  const link = toInterviewLink(previous, places, detailHref(ADMIN_INTERVIEWS_PATH, previous.id))
  return <RelatedLinksList links={[{ ...link, onClick: onOpen }]} />
}

function buildInterviewDetail(
  interview: AdminInterview,
  titles: ReadonlyMap<string, string>,
  places: ReadonlyMap<string, InterviewPlace>,
  previous: AdminInterview | null,
  onEdit: () => void,
  onOpenPrevious: (() => void) | undefined,
): DetailContent {
  const company = leadingCompany(interview)
  const { opportunity } = interview

  return {
    title: titles.get(interview.id) ?? "",
    ...(company ? { subtitle: company.name } : {}),
    status: statusBadge(interview, { variant: "outline", meta: true }),
    // Statut et Mené par sont portés par l'en-tête et le sous-titre : le bloc Échange ne les répète pas.
    sections: [
      {
        title: OPPORTUNITY_SECTION_TITLES.opportunity,
        rows: [
          { value: opportunityValue(interview), fullWidth: true },
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
        title: "Échange",
        rows: [
          { label: LABELS.type, value: typeBadge(interview) },
          { label: LABELS.scheduledAt, value: formatShortDateTime(interview.scheduledAt) },
          { label: LABELS.outcome, value: outcomeBadge(interview), fullWidth: true },
          {
            label: LABELS.correspondentIds,
            value: correspondentsValue(interview),
            fullWidth: true,
          },
        ],
      },
      {
        title: LABELS.details,
        rows: [
          {
            value: interview.details ? (
              <MarkdownContent markdown={interview.details} variant="admin" />
            ) : null,
            fullWidth: true,
          },
        ],
      },
      {
        title: "Évaluation",
        rows: [
          {
            label: LABELS.score,
            value: interview.score === null ? null : `${interview.score} / 10`,
          },
          { label: LABELS.decision, value: decisionBadge(interview) },
        ],
      },
      { title: LABELS.notes, rows: [{ value: interview.notes, fullWidth: true }] },
      {
        title: "Entretien précédent",
        rows: [{ value: previousValue(previous, places, onOpenPrevious), fullWidth: true }],
      },
    ],
    onEdit,
  }
}

const facets: readonly Facet<AdminInterview>[] = [
  {
    key: "type",
    label: LABELS.type,
    options: INTERVIEW_TYPES.map((type) => ({ value: type, label: INTERVIEW_TYPE_LABELS[type] })),
    value: (interview) => interview.type,
  },
  {
    key: "status",
    label: LABELS.status,
    options: INTERVIEW_STATUSES.map((status) => ({
      value: status,
      label: INTERVIEW_STATUS_LABELS[status],
    })),
    value: (interview) => interview.status,
  },
  {
    key: "outcome",
    label: LABELS.outcome,
    options: INTERVIEW_OUTCOMES.map((outcome) => ({
      value: outcome,
      label: INTERVIEW_OUTCOME_LABELS[outcome],
    })),
    value: (interview) => (interview.outcome ? [interview.outcome] : []),
  },
]

interface Props {
  interviews: readonly AdminInterview[]
  view: InterviewView
  initialDetailId?: string
}

export function InterviewsTable({ interviews, view, initialDetailId }: Props) {
  const router = useRouter()
  const [selectedInterview, setSelectedInterview] = useState<AdminInterview | null>(
    () => interviews.find((interview) => interview.id === initialDetailId) ?? null,
  )
  // Instant figé au montage : la vue À venir reste stable pendant la consultation.
  const [now] = useState(() => Date.now())

  // Titres calculés sur tous les entretiens, jamais sur la seule vue : « Entretien 2 » le reste même si l'entretien 1 n'y figure pas.
  const places = useMemo(() => interviewPlaces(interviews), [interviews])
  const titles = useMemo(
    () =>
      new Map(
        interviews.map((interview) => [
          interview.id,
          interviewTitle(interview.type, places.get(interview.id)?.number ?? null),
        ]),
      ),
    [interviews, places],
  )
  const viewInterviews = useMemo(
    () => interviewsForView(interviews, view, now),
    [interviews, view, now],
  )

  const columns = useMemo<readonly Column<AdminInterview>[]>(
    () => [
      ...buildDataColumns(titles, view),
      actionsColumn((interview: AdminInterview) =>
        rowActions(interview, titles.get(interview.id) ?? ""),
      ),
    ],
    [titles, view],
  )

  const detail = useMemo<DetailContent | null>(() => {
    if (!selectedInterview) return null
    const previousId = places.get(selectedInterview.id)?.previousId
    const previous = interviews.find((interview) => interview.id === previousId) ?? null
    // Dans le Journal le lien garde la même route : la table reste montée, la sélection change donc ici. Depuis À venir, le href mène au Journal.
    const onOpenPrevious =
      previous && view === "journal"
        ? () => {
            setSelectedInterview(previous)
          }
        : undefined
    return buildInterviewDetail(
      selectedInterview,
      titles,
      places,
      previous,
      () => {
        router.push(`${ADMIN_INTERVIEWS_PATH}/${selectedInterview.id}`)
      },
      onOpenPrevious,
    )
  }, [selectedInterview, places, interviews, titles, router, view])

  return (
    <>
      <DataTable
        rows={viewInterviews}
        columns={columns}
        getRowId={(interview) => interview.id}
        searchPlaceholder="Rechercher une opportunité, une entreprise ou un correspondant"
        noun="entretien"
        onRowClick={setSelectedInterview}
        rowLabel={(interview) => titles.get(interview.id) ?? ""}
        facets={facets}
        empty={{
          icon: MessageCircle,
          title: "Aucun entretien",
          description: "Aucun entretien dans cette vue. Créez-en un via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedInterview(null)
        }}
      />
    </>
  )
}
