import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import {
  linksSection,
  markdownSection,
  textSection,
} from "@/components/features/admin/detail/detail-sections"
import { contractBadge, workModeBadge, zoneBadge } from "@/components/features/admin/display/badges"
import { CompanyLink, PersonLink } from "@/components/features/admin/display/record-links"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin/routes"
import { detailHref } from "@/lib/admin/detail-links"
import { toOpportunityInterviewLinks } from "@/lib/crm/interviews"
import {
  formatDailyRate,
  formatDays,
  formatDuration,
  formatStartMonth,
  OPPORTUNITY_FIELD_LABELS as LABELS,
  OPPORTUNITY_SECTION_TITLES,
  OPPORTUNITY_STATUS_ICONS,
  OPPORTUNITY_STATUS_LABELS,
} from "@/lib/crm/opportunities"
import type { AdminOpportunity } from "@/server/queries/opportunities"

export function buildOpportunityDetail(
  opportunity: AdminOpportunity,
  onEdit: () => void,
): DetailContent {
  return {
    title: opportunity.title,
    ...(opportunity.role ? { subtitle: opportunity.role } : {}),
    badges: [headerBadge(opportunity.status, OPPORTUNITY_STATUS_LABELS, OPPORTUNITY_STATUS_ICONS)],
    // Intitulé, Rôle et Statut sont dans l'en-tête : le bloc Opportunité du formulaire n'a pas de pendant ici.
    sections: [
      {
        title: OPPORTUNITY_SECTION_TITLES.relations,
        rows: [
          {
            label: LABELS.referrerId,
            value: opportunity.referrer ? <PersonLink person={opportunity.referrer} /> : null,
          },
          {
            label: LABELS.intermediaryId,
            value: opportunity.intermediary ? (
              <CompanyLink company={opportunity.intermediary} />
            ) : null,
          },
          {
            label: LABELS.clientId,
            value: opportunity.client ? <CompanyLink company={opportunity.client} /> : null,
          },
        ],
      },
      {
        title: OPPORTUNITY_SECTION_TITLES.conditions,
        rows: [
          { label: LABELS.dailyRate, value: formatDailyRate(opportunity.dailyRate) },
          { label: LABELS.contract, value: contractBadge(opportunity) },
          { label: LABELS.workMode, value: workModeBadge(opportunity) },
          { label: LABELS.zone, value: zoneBadge(opportunity) },
          { label: LABELS.daysPerWeek, value: formatDays(opportunity.daysPerWeek) },
          { label: LABELS.onSiteDays, value: formatDays(opportunity.onSiteDays) },
        ],
      },
      {
        title: OPPORTUNITY_SECTION_TITLES.calendar,
        rows: [
          { label: LABELS.startMonth, value: formatStartMonth(opportunity.startMonth) },
          { label: LABELS.durationMonths, value: formatDuration(opportunity.durationMonths) },
        ],
      },
      textSection(OPPORTUNITY_SECTION_TITLES.notes, opportunity.notes),
      markdownSection(OPPORTUNITY_SECTION_TITLES.details, opportunity.details),
      linksSection(
        OPPORTUNITY_SECTION_TITLES.interviews,
        toOpportunityInterviewLinks(opportunity.interviews, (id) =>
          detailHref(ADMIN_INTERVIEWS_PATH, id),
        ),
      ),
    ],
    onEdit,
  }
}
