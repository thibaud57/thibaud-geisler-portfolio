import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import {
  linksSection,
  markdownSection,
  textSection,
} from "@/components/features/admin/detail/detail-sections"
import { enumBadge } from "@/components/features/admin/display/badges"
import { linkedinLink } from "@/components/features/admin/display/record-links"
import { personActionsSection } from "@/components/features/admin/persons/person-actions-section"
import { personDetailSections } from "@/components/features/admin/persons/person-table"
import { signalsSection } from "@/components/features/admin/signals/signal-detail"
import { ADMIN_INTERVIEWS_PATH, ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import { formatDateOnly, formatShortInstantDate } from "@/lib/date-time"
import { detailHref } from "@/lib/admin/detail-links"
import { contactDetailHrefOf } from "@/lib/crm/person-links"
import { toLeadInterviewLinks } from "@/lib/crm/interviews"
import { JOB_ROLE_LABELS } from "@/lib/crm/job-roles"
import {
  LEAD_DISPLAY_STATUS_ICONS,
  LEAD_DISPLAY_STATUS_LABELS,
  leadDisplayStatus,
} from "@/lib/crm/lead-display-status"
import {
  LEAD_CHANNEL_ICONS,
  LEAD_CHANNEL_LABELS,
  LEAD_FIELD_LABELS,
  LEAD_INTEREST_ICONS,
  LEAD_INTEREST_LABELS,
  LEAD_ORIGIN_ICONS,
  LEAD_ORIGIN_LABELS,
  LEAD_SECTION_TITLES,
} from "@/lib/crm/leads"
import {
  OPTED_OUT_LABEL,
  PERSON_FIELD_LABELS,
  PERSON_SECTION_TITLES,
  personDisplayName,
} from "@/lib/crm/persons"
import { toOpportunityLink } from "@/lib/crm/opportunities"
import { type SignalItem } from "@/lib/crm/signals"
import type { AdminLead } from "@/server/queries/leads"
import type { ActionTimelineRow } from "@/server/queries/prospecting-actions"

export function interestBadge(lead: AdminLead) {
  return enumBadge(lead.interest, LEAD_INTEREST_LABELS, LEAD_INTEREST_ICONS)
}

export function originBadge(lead: AdminLead) {
  return enumBadge(lead.origin, LEAD_ORIGIN_LABELS, LEAD_ORIGIN_ICONS)
}

export function channelBadge(lead: AdminLead) {
  return enumBadge(lead.channel, LEAD_CHANNEL_LABELS, LEAD_CHANNEL_ICONS)
}

function headerStatusBadge(lead: AdminLead, now: Date) {
  const status = leadDisplayStatus(lead, now)
  if (status === null) return { label: OPTED_OUT_LABEL }
  return headerBadge(status, LEAD_DISPLAY_STATUS_LABELS, LEAD_DISPLAY_STATUS_ICONS)
}

function opportunitiesSection(lead: AdminLead) {
  return linksSection(
    LEAD_SECTION_TITLES.opportunities,
    lead.opportunities.map((opportunity) =>
      toOpportunityLink(opportunity, {
        href: detailHref(ADMIN_OPPORTUNITIES_PATH, opportunity.id),
        metaSuffix: opportunity.client?.name,
      }),
    ),
  )
}

function interviewsSection(lead: AdminLead) {
  return linksSection(
    LEAD_SECTION_TITLES.interviews,
    toLeadInterviewLinks(lead.interviews, (id) => detailHref(ADMIN_INTERVIEWS_PATH, id)),
  )
}

export function buildLeadDetail(
  lead: AdminLead,
  history: readonly ActionTimelineRow[],
  onEdit: () => void,
  now: Date,
  onOpenSignal: (signal: SignalItem) => void,
): DetailContent {
  if (lead.optedOutAt) {
    return {
      title: personDisplayName(lead),
      badges: [headerStatusBadge(lead, now)],
      sections: [
        {
          title: PERSON_SECTION_TITLES.optOut,
          rows: [
            { label: PERSON_FIELD_LABELS.email, value: lead.email },
            { label: PERSON_FIELD_LABELS.linkedinUrl, value: linkedinLink(lead) },
            {
              label: PERSON_FIELD_LABELS.optedOutAt,
              value: formatShortInstantDate(lead.optedOutAt),
            },
            {
              label: PERSON_FIELD_LABELS.exchangesErasedAt,
              value: formatShortInstantDate(lead.exchangesErasedAt),
            },
          ],
        },
        // L'historique se lit aussi pour un lead opposé : ses actions restent, sauf effacement demandé.
        personActionsSection(history),
        opportunitiesSection(lead),
        interviewsSection(lead),
      ],
    }
  }

  return {
    title: personDisplayName(lead),
    ...(lead.jobRole ? { subtitle: JOB_ROLE_LABELS[lead.jobRole] } : {}),
    badges: [headerStatusBadge(lead, now)],
    // Le poste est dans le sous-titre et le statut en tête : ni l'un ni l'autre n'a de ligne dans un bloc.
    sections: [
      ...personDetailSections(lead, {
        label: LEAD_FIELD_LABELS.contactRole,
        href: contactDetailHrefOf(lead),
      }),
      {
        title: LEAD_SECTION_TITLES.pipeline,
        rows: [
          { label: LEAD_FIELD_LABELS.interest, value: interestBadge(lead) },
          {
            label: LEAD_FIELD_LABELS.score,
            value: lead.score === null ? null : `${lead.score} / 10`,
          },
          { label: LEAD_FIELD_LABELS.origin, value: originBadge(lead) },
          { label: LEAD_FIELD_LABELS.channel, value: channelBadge(lead) },
          {
            label: PERSON_FIELD_LABELS.metAt,
            value: formatDateOnly(lead.metAt),
          },
          {
            label: LEAD_FIELD_LABELS.lastReplyAt,
            value: formatShortInstantDate(lead.lastReplyAt),
          },
        ],
      },
      textSection(PERSON_SECTION_TITLES.notes, lead.notes),
      markdownSection(PERSON_SECTION_TITLES.details, lead.details),
      personActionsSection(history),
      opportunitiesSection(lead),
      interviewsSection(lead),
      ...signalsSection(lead.signals, now, onOpenSignal),
    ],
    onEdit,
  }
}
