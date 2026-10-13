import { BadgeList } from "@/components/features/admin/display/BadgeList"
import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import { markdownSection, textSection } from "@/components/features/admin/detail/detail-sections"
import { iconsByLabel } from "@/components/features/admin/table/table-cells"
import { personDetailSections } from "@/components/features/admin/persons/person-table"
import {
  CONTACT_FIELD_LABELS,
  CONTACT_SECTION_TITLES,
  CONTACT_STATUS_ICONS,
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_ICONS,
  CONTACT_TYPE_LABELS,
} from "@/lib/crm/contacts"
import { formatDateOnly } from "@/lib/date-time"
import { JOB_ROLE_LABELS } from "@/lib/crm/job-roles"
import { leadDetailHrefOf } from "@/lib/crm/person-links"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/crm/persons"
import { CONTACT_TYPES } from "@/lib/schemas/network-contact"
import type { AdminContact } from "@/server/queries/contacts"

export function typeLabels(contact: AdminContact): string[] {
  return contact.types.map((type) => CONTACT_TYPE_LABELS[type])
}

export const TYPE_ICONS_BY_LABEL = iconsByLabel(
  CONTACT_TYPES,
  CONTACT_TYPE_LABELS,
  CONTACT_TYPE_ICONS,
)

export function buildContactDetail(contact: AdminContact, onEdit: () => void): DetailContent {
  return {
    title: personDisplayName(contact),
    ...(contact.jobRole ? { subtitle: JOB_ROLE_LABELS[contact.jobRole] } : {}),
    badges: [headerBadge(contact.status, CONTACT_STATUS_LABELS, CONTACT_STATUS_ICONS)],
    sections: [
      ...personDetailSections(contact, {
        label: CONTACT_FIELD_LABELS.leadRole,
        href: leadDetailHrefOf(contact),
      }),
      {
        title: CONTACT_SECTION_TITLES.relation,
        rows: [
          {
            label: CONTACT_FIELD_LABELS.types,
            value: (
              <BadgeList
                labels={typeLabels(contact)}
                noun="types"
                max={Infinity}
                icons={TYPE_ICONS_BY_LABEL}
              />
            ),
          },
          {
            label: PERSON_FIELD_LABELS.metAt,
            value: contact.metAt ? formatDateOnly(contact.metAt) : null,
          },
        ],
      },
      textSection(PERSON_SECTION_TITLES.notes, contact.notes),
      markdownSection(PERSON_SECTION_TITLES.details, contact.details),
    ],
    onEdit,
  }
}
