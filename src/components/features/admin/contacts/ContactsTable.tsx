"use client"

import { useCallback, useMemo, useState } from "react"
import { User } from "lucide-react"
import { useRouter } from "next/navigation"

import { BadgeList } from "@/components/features/admin/BadgeList"
import { DataTable, type Column } from "@/components/features/admin/table/DataTable"
import { headerBadge, type DetailContent } from "@/components/features/admin/detail/DetailDialog"
import {
  linksSection,
  markdownSection,
  textSection,
} from "@/components/features/admin/detail/detail-sections"
import { EditRowLink } from "@/components/features/admin/table/EditRowLink"
import {
  actionsColumn,
  enumBadge,
  enumFacet,
  hideableColumn,
  iconsByLabel,
} from "@/components/features/admin/table/table-cells"
import { DeleteContactDialog } from "@/components/features/admin/contacts/DeleteContactDialog"
import {
  personColumns,
  personDetailSections,
  personFacets,
} from "@/components/features/admin/persons/person-table"
import type { Facet } from "@/hooks/use-faceted-search"
import { useRowDetail } from "@/hooks/use-row-detail"
import { ADMIN_CONTACTS_PATH, ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import { CONTACT_COLUMN_WIDTHS, CONTACT_DEFAULT_VISIBLE_COLUMNS } from "@/lib/admin/table-widths"
import {
  CONTACT_FIELD_LABELS,
  CONTACT_SECTION_TITLES,
  CONTACT_STATUS_ICONS,
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_ICONS,
  CONTACT_TYPE_LABELS,
} from "@/lib/crm/contacts"
import { formatDateOnly, formatShortInstantDate } from "@/lib/date-time"
import { detailHref } from "@/lib/admin/detail-links"
import { JOB_ROLE_LABELS } from "@/lib/crm/job-roles"
import { LEAD_DISPLAY_STATUS_LABELS } from "@/lib/crm/lead-display-status"
import { LEAD_INTEREST_LABELS } from "@/lib/crm/leads"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/crm/persons"
import { CONTACT_STATUSES, CONTACT_TYPES } from "@/lib/schemas/network-contact"
import type { AdminContact } from "@/server/queries/contacts"

function typeLabels(contact: AdminContact): string[] {
  return contact.types.map((type) => CONTACT_TYPE_LABELS[type])
}

const TYPE_ICONS_BY_LABEL = iconsByLabel(CONTACT_TYPES, CONTACT_TYPE_LABELS, CONTACT_TYPE_ICONS)

function rowActions(contact: AdminContact) {
  return (
    <>
      <EditRowLink
        href={`${ADMIN_CONTACTS_PATH}/${contact.id}`}
        label={`Modifier ${personDisplayName(contact)}`}
      />
      <DeleteContactDialog contact={contact} />
    </>
  )
}

const personCols = personColumns<AdminContact>(
  CONTACT_COLUMN_WIDTHS,
  CONTACT_DEFAULT_VISIBLE_COLUMNS,
)

const COLUMNS: readonly Column<AdminContact>[] = [
  personCols.name,
  {
    key: "types",
    header: CONTACT_FIELD_LABELS.types,
    width: CONTACT_COLUMN_WIDTHS.types,
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "types"),
    cell: (contact) => (
      <BadgeList labels={typeLabels(contact)} noun="types" icons={TYPE_ICONS_BY_LABEL} />
    ),
  },
  personCols.company,
  {
    key: "status",
    header: CONTACT_FIELD_LABELS.status,
    width: CONTACT_COLUMN_WIDTHS.status,
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "status"),
    cell: (contact) => enumBadge(contact.status, CONTACT_STATUS_LABELS, CONTACT_STATUS_ICONS),
  },
  personCols.zone,
  personCols.email,
  personCols.phone,
  personCols.linkedinUrl,
  {
    key: "reviewAt",
    wrapHeader: true,
    header: CONTACT_FIELD_LABELS.reviewAt,
    width: CONTACT_COLUMN_WIDTHS.reviewAt,
    className: "tabular-nums text-muted-foreground",
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "reviewAt"),
    sortValue: (contact) => contact.reviewAt.getTime(),
    cell: (contact) => formatShortInstantDate(contact.reviewAt),
  },
  personCols.notes,
  actionsColumn(rowActions),
]

function pipelineMeta(leadRole: NonNullable<AdminContact["leadRole"]>): string {
  return [
    LEAD_DISPLAY_STATUS_LABELS[leadRole.status],
    leadRole.interest ? LEAD_INTEREST_LABELS[leadRole.interest] : null,
  ]
    .filter((part): part is string => part !== null)
    .join(" · ")
}

function buildContactDetail(contact: AdminContact, onEdit: () => void): DetailContent {
  return {
    title: personDisplayName(contact),
    ...(contact.jobRole ? { subtitle: JOB_ROLE_LABELS[contact.jobRole] } : {}),
    badges: [headerBadge(contact.status, CONTACT_STATUS_LABELS, CONTACT_STATUS_ICONS)],
    sections: [
      ...personDetailSections(contact),
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
          {
            label: CONTACT_FIELD_LABELS.reviewAt,
            value: formatShortInstantDate(contact.reviewAt),
          },
        ],
      },
      textSection(PERSON_SECTION_TITLES.notes, contact.notes),
      markdownSection(PERSON_SECTION_TITLES.details, contact.details),
      linksSection(
        CONTACT_SECTION_TITLES.pipeline,
        contact.leadRole
          ? [
              {
                id: contact.id,
                href: detailHref(ADMIN_LEADS_PATH, contact.id),
                label: "Fiche lead",
                meta: pipelineMeta(contact.leadRole),
              },
            ]
          : [],
      ),
    ],
    onEdit,
  }
}

const baseFacets: readonly Facet<AdminContact>[] = [
  enumFacet(
    "types",
    CONTACT_FIELD_LABELS.types,
    CONTACT_TYPES,
    CONTACT_TYPE_LABELS,
    (contact) => contact.types,
  ),
  enumFacet(
    "status",
    CONTACT_FIELD_LABELS.status,
    CONTACT_STATUSES,
    CONTACT_STATUS_LABELS,
    (contact) => contact.status,
  ),
]

interface Props {
  contacts: readonly AdminContact[]
  initialDetailId?: string
}

export function ContactsTable({ contacts, initialDetailId }: Props) {
  const router = useRouter()
  // Instant figé au montage : le filtre d'échéance reste stable pendant la consultation.
  const [now] = useState(() => new Date())

  const facets = useMemo(() => {
    const { zone, overdue } = personFacets<AdminContact>((contact) => contact.reviewAt < now)
    return [...baseFacets, zone, overdue]
  }, [now])

  const buildDetail = useCallback(
    (contact: AdminContact) =>
      buildContactDetail(contact, () => {
        router.push(`${ADMIN_CONTACTS_PATH}/${contact.id}`)
      }),
    [router],
  )

  const { open, dialog } = useRowDetail({ rows: contacts, initialDetailId, build: buildDetail })

  return (
    <>
      <DataTable
        rows={contacts}
        columns={COLUMNS}
        getRowId={(contact) => contact.id}
        searchPlaceholder="Rechercher un nom ou une entreprise"
        noun="contact"
        onRowClick={open}
        rowLabel={personDisplayName}
        facets={facets}
        empty={{
          icon: User,
          title: "Aucun contact",
          description: "Aucun contact pour le moment. Créez-en un via le bouton ci-dessus.",
        }}
      />
      {dialog}
    </>
  )
}
