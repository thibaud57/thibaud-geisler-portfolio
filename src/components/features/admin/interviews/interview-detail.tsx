import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import {
  linksSection,
  markdownSection,
  textSection,
} from "@/components/features/admin/detail/detail-sections"
import {
  contractBadge,
  enumBadge,
  workModeBadge,
  zoneBadge,
} from "@/components/features/admin/display/badges"
import { companyCell, PersonLink } from "@/components/features/admin/display/record-links"
import { ADMIN_INTERVIEWS_PATH, ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import { formatShortDateTime } from "@/lib/date-time"
import { detailHref } from "@/lib/admin/detail-links"
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
  interviewTitleOf,
  toInterviewLink,
} from "@/lib/crm/interviews"
import {
  formatDailyRate,
  OPPORTUNITY_FIELD_LABELS,
  OPPORTUNITY_SECTION_TITLES,
  OPPORTUNITY_STATUS_LABELS,
} from "@/lib/crm/opportunities"
import type { AdminInterview } from "@/server/queries/interviews"

export function leadingCompany(interview: AdminInterview) {
  return interview.side === "ESN"
    ? interview.opportunity.intermediary
    : interview.opportunity.client
}

export function typeBadge(interview: AdminInterview) {
  return enumBadge(interview.type, INTERVIEW_TYPE_LABELS, INTERVIEW_TYPE_ICONS)
}

export function formatBadge(interview: AdminInterview) {
  return enumBadge(interview.format, INTERVIEW_FORMAT_LABELS, INTERVIEW_FORMAT_ICONS)
}

export function outcomeBadge(interview: AdminInterview) {
  return enumBadge(interview.outcome, INTERVIEW_OUTCOME_LABELS, INTERVIEW_OUTCOME_ICONS)
}

export function decisionBadge(interview: AdminInterview) {
  return enumBadge(interview.decision, INTERVIEW_DECISION_LABELS, INTERVIEW_DECISION_ICONS)
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

export function buildInterviewDetail(
  interview: AdminInterview,
  places: ReadonlyMap<string, InterviewPlace>,
  previous: AdminInterview | null,
  onEdit: () => void,
  onOpenPrevious: (() => void) | undefined,
): DetailContent {
  const { opportunity } = interview

  return {
    title: interviewTitleOf(interview, places),
    subtitle: formatShortDateTime(interview.scheduledAt),
    badges: [headerBadge(interview.status, INTERVIEW_STATUS_LABELS, INTERVIEW_STATUS_ICONS)],
    sections: [
      {
        title: INTERVIEW_SECTION_TITLES.exchange,
        rows: [
          { label: LABELS.type, value: typeBadge(interview) },
          { label: LABELS.format, value: formatBadge(interview) },
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
