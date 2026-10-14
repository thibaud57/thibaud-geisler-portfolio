import {
  headerBadge,
  type DetailContent,
  type DetailSection,
} from "@/components/features/admin/detail/DetailDialog"
import {
  linksSection,
  markdownSection,
  textSection,
} from "@/components/features/admin/detail/detail-sections"
import { iconsByLabel } from "@/components/features/admin/table/table-cells"
import { labelBadge } from "@/components/features/admin/display/badges"
import { BadgeList } from "@/components/features/admin/display/BadgeList"
import { ExternalUrl } from "@/components/features/admin/display/ExternalUrl"
import { signalsSection } from "@/components/features/admin/signals/signal-detail"
import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SECTOR_LABELS,
  COMPANY_SIZE_HEADCOUNTS,
  COMPANY_SIZE_LABELS,
  COMPANY_STATUS_ICONS,
  COMPANY_TYPE_ICONS,
  COMPANY_TYPE_LABELS,
  companyOpportunities,
  RELATION_STATUS_LABELS,
} from "@/lib/crm/companies"
import {
  countryName,
  LEGAL_ENTITY_FIELD_LABELS,
  LEGAL_FORM_LABELS,
  registrationLabel,
  VAT_REGIME_LABELS,
} from "@/lib/crm/legal-entities"
import { ADMIN_LEADS_PATH, ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import { LEAD_DISPLAY_STATUS_LABELS } from "@/lib/crm/lead-display-status"
import { toLeadLink } from "@/lib/crm/leads"
import { formatSiret } from "@/lib/legal/format-siret"
import { toOpportunityLink } from "@/lib/crm/opportunities"
import { formatDateOnly, formatShortInstantDate } from "@/lib/date-time"
import { detailHref } from "@/lib/admin/detail-links"
import { COMPANY_TYPES } from "@/lib/schemas/company"
import { type SignalItem } from "@/lib/crm/signals"
import { ZONE_LABELS } from "@/lib/crm/zones"
import type { AdminCompany } from "@/server/queries/companies"

export function typeLabels(company: AdminCompany): string[] {
  return company.types.map((type) => COMPANY_TYPE_LABELS[type])
}

export function sectorLabels(company: AdminCompany): string[] {
  return company.sectors.map((sector) => COMPANY_SECTOR_LABELS[sector])
}

export function zoneLabels(company: AdminCompany): string[] {
  return company.zones.map((zone) => ZONE_LABELS[zone])
}

export const TYPE_ICONS_BY_LABEL = iconsByLabel(
  COMPANY_TYPES,
  COMPANY_TYPE_LABELS,
  COMPANY_TYPE_ICONS,
)

export function workedLabel(company: AdminCompany): string {
  return company.worked ? "Oui" : "Non"
}

export function sizeBadge(company: AdminCompany) {
  if (!company.size) return null
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge variant="secondary" tabIndex={0}>
          {COMPANY_SIZE_LABELS[company.size]}
        </Badge>
      </TooltipTrigger>
      <TooltipContent>{COMPANY_SIZE_HEADCOUNTS[company.size]}</TooltipContent>
    </Tooltip>
  )
}

const CAPITAL_FORMATTER = new Intl.NumberFormat("fr")

function legalEntitySection(company: AdminCompany): DetailSection {
  const entity = company.legalEntity
  const publisher = entity?.publisher

  return {
    title: COMPANY_SECTION_TITLES.legalEntity,
    rows: [
      { label: LEGAL_ENTITY_FIELD_LABELS.name, value: entity?.name },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.legalForm,
        value: labelBadge(entity?.legalForm ? LEGAL_FORM_LABELS[entity.legalForm] : null),
      },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.siret,
        value: entity?.siret ? formatSiret(entity.siret) : null,
      },
      { label: LEGAL_ENTITY_FIELD_LABELS.vatNumber, value: entity?.vatNumber },
      { label: LEGAL_ENTITY_FIELD_LABELS.street, value: entity?.address?.street },
      { label: LEGAL_ENTITY_FIELD_LABELS.postalCode, value: entity?.address?.postalCode },
      { label: LEGAL_ENTITY_FIELD_LABELS.city, value: entity?.address?.city },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.country,
        value: entity?.address ? countryName(entity.address.country) : null,
      },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.registration,
        value: entity ? registrationLabel(entity) : null,
      },
      { label: LEGAL_ENTITY_FIELD_LABELS.phone, value: entity?.phone },
      {
        label: LEGAL_ENTITY_FIELD_LABELS.capitalAmount,
        value:
          entity && entity.capitalAmount !== null
            ? CAPITAL_FORMATTER.format(entity.capitalAmount)
            : null,
      },
      { label: LEGAL_ENTITY_FIELD_LABELS.capitalCurrency, value: entity?.capitalCurrency },
      ...(publisher
        ? [
            {
              label: LEGAL_ENTITY_FIELD_LABELS.vatLiableSince,
              value: formatDateOnly(publisher.vatLiableSince),
            },
            {
              label: LEGAL_ENTITY_FIELD_LABELS.vatRegime,
              value: labelBadge(
                publisher.vatRegime ? VAT_REGIME_LABELS[publisher.vatRegime] : null,
              ),
            },
          ]
        : []),
    ],
  }
}

export function buildCompanyDetail(
  company: AdminCompany,
  onEdit: () => void,
  now: Date,
  onOpenSignal: (signal: SignalItem) => void,
): DetailContent {
  return {
    image: { assetKey: company.logoFilename },
    title: company.name,
    subtitle: company.slug,
    badges: [headerBadge(company.relationStatus, RELATION_STATUS_LABELS, COMPANY_STATUS_ICONS)],
    sections: [
      {
        title: COMPANY_SECTION_TITLES.identity,
        rows: [
          {
            label: COMPANY_FIELD_LABELS.websiteUrl,
            value: company.websiteUrl ? (
              <ExternalUrl url={company.websiteUrl} className="wrap-anywhere" />
            ) : null,
          },
          {
            label: COMPANY_FIELD_LABELS.zones,
            value: <BadgeList labels={zoneLabels(company)} noun="localités" max={Infinity} />,
          },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.classification,
        rows: [
          {
            label: COMPANY_FIELD_LABELS.types,
            value: (
              <BadgeList
                labels={typeLabels(company)}
                noun="types"
                max={Infinity}
                icons={TYPE_ICONS_BY_LABEL}
              />
            ),
          },
          {
            label: COMPANY_FIELD_LABELS.sectors,
            value: <BadgeList labels={sectorLabels(company)} noun="secteurs" max={Infinity} />,
          },
        ],
      },
      {
        title: COMPANY_SECTION_TITLES.relation,
        rows: [
          { label: COMPANY_FIELD_LABELS.size, value: sizeBadge(company) },
          { label: COMPANY_FIELD_LABELS.worked, value: workedLabel(company) },
          {
            label: COMPANY_FIELD_LABELS.firstContactAt,
            value: formatShortInstantDate(company.firstContactAt),
          },
          {
            label: COMPANY_FIELD_LABELS.endClients,
            value:
              company.endClients.length > 0 ? (
                <BadgeList labels={company.endClients} noun="clients" max={Infinity} />
              ) : null,
          },
        ],
      },
      legalEntitySection(company),
      textSection(COMPANY_SECTION_TITLES.notes, company.notes),
      markdownSection(COMPANY_SECTION_TITLES.details, company.details),
      linksSection(
        COMPANY_SECTION_TITLES.leads,
        company.leads.map((lead) =>
          toLeadLink(lead, {
            href: detailHref(ADMIN_LEADS_PATH, lead.id),
            statusLabel: lead.status ? LEAD_DISPLAY_STATUS_LABELS[lead.status] : undefined,
          }),
        ),
      ),
      linksSection(
        COMPANY_SECTION_TITLES.opportunities,
        companyOpportunities(company).map(({ opportunity, role }) =>
          toOpportunityLink(opportunity, {
            href: detailHref(ADMIN_OPPORTUNITIES_PATH, opportunity.id),
            metaSuffix: role,
            idPrefix: role,
          }),
        ),
      ),
      ...signalsSection(company.signals, now, onOpenSignal),
    ],
    onEdit,
  }
}
