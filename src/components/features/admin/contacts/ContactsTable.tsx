"use client"

import { useMemo, useState, type ComponentProps } from "react"
import { Pencil, User } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { BadgeList } from "@/components/features/admin/BadgeList"
import { DataTable, type Column, type Facet } from "@/components/features/admin/DataTable"
import { type DetailContent, DetailDialog } from "@/components/features/admin/DetailDialog"
import { EnumBadge } from "@/components/features/admin/EnumBadge"
import { ExternalUrl } from "@/components/features/admin/ExternalUrl"
import { RelatedLinksList } from "@/components/features/admin/RelatedLinksList"
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
import { DeleteContactDialog } from "@/components/features/admin/contacts/DeleteContactDialog"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Badge } from "@/components/ui/badge"
import { ADMIN_COMPANIES_PATH, ADMIN_CONTACTS_PATH, ADMIN_LEADS_PATH } from "@/lib/admin-routes"
import { CONTACT_COLUMN_WIDTHS, CONTACT_DEFAULT_VISIBLE_COLUMNS } from "@/lib/admin-table-widths"
import {
  CONTACT_FIELD_LABELS,
  CONTACT_SECTION_TITLES,
  CONTACT_STATUS_ICONS,
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_ICONS,
  CONTACT_TYPE_LABELS,
} from "@/lib/contacts"
import { formatShortInstantDate } from "@/lib/date-time"
import { detailHref } from "@/lib/detail-links"
import { JOB_ROLE_LABELS } from "@/lib/job-roles"
import { LEAD_DISPLAY_STATUS_LABELS } from "@/lib/lead-display-status"
import { LEAD_INTEREST_LABELS } from "@/lib/leads"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/persons"
import { CONTACT_STATUSES, CONTACT_TYPES } from "@/lib/schemas/network-contact"
import { STANDALONE_LINK_CLASS } from "@/lib/typography"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import type { AdminContact } from "@/server/queries/contacts"

function typeLabels(contact: AdminContact): string[] {
  return contact.types.map((type) => CONTACT_TYPE_LABELS[type])
}

// Glyphe par libellé plutôt que par valeur : BadgeList ne connaît que les libellés déjà résolus.
const TYPE_ICONS_BY_LABEL = Object.fromEntries(
  CONTACT_TYPES.map((type) => [CONTACT_TYPE_LABELS[type], CONTACT_TYPE_ICONS[type]]),
)

function statusBadge(
  contact: AdminContact,
  badgeProps?: Omit<ComponentProps<typeof Badge>, "children">,
) {
  return (
    <EnumBadge
      label={CONTACT_STATUS_LABELS[contact.status]}
      icon={CONTACT_STATUS_ICONS[contact.status]}
      {...badgeProps}
    />
  )
}

function rowActions(contact: AdminContact) {
  return (
    <>
      <RowActionButton aria-label={`Modifier ${personDisplayName(contact)}`} asChild>
        <Link href={`${ADMIN_CONTACTS_PATH}/${contact.id}`}>
          <Pencil className="size-4" />
        </Link>
      </RowActionButton>
      <DeleteContactDialog contact={contact} />
    </>
  )
}

const DATA_COLUMNS: readonly Column<AdminContact>[] = [
  {
    key: "name",
    header: PERSON_FIELD_LABELS.name,
    width: CONTACT_COLUMN_WIDTHS.name,
    sortValue: (contact) => personDisplayName(contact),
    searchValue: (contact) => `${personDisplayName(contact)} ${contact.company?.name ?? ""}`,
    cell: (contact) => (
      <TruncateTooltip className="block w-full font-medium">
        {personDisplayName(contact)}
      </TruncateTooltip>
    ),
  },
  {
    key: "types",
    header: CONTACT_FIELD_LABELS.types,
    width: CONTACT_COLUMN_WIDTHS.types,
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "types"),
    cell: (contact) => (
      <BadgeList labels={typeLabels(contact)} noun="types" icons={TYPE_ICONS_BY_LABEL} />
    ),
  },
  {
    key: "company",
    header: PERSON_FIELD_LABELS.companyId,
    width: CONTACT_COLUMN_WIDTHS.company,
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "company"),
    sortValue: (contact) => contact.company?.name ?? "",
    cell: companyCell,
  },
  {
    key: "status",
    header: CONTACT_FIELD_LABELS.status,
    width: CONTACT_COLUMN_WIDTHS.status,
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "status"),
    cell: statusBadge,
  },
  {
    key: "lastInteractionAt",
    header: CONTACT_FIELD_LABELS.lastInteractionAt,
    width: CONTACT_COLUMN_WIDTHS.lastInteractionAt,
    className: "tabular-nums text-muted-foreground",
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "lastInteractionAt"),
    sortValue: (contact) => contact.lastInteractionAt?.getTime() ?? 0,
    cell: (contact) => formatShortInstantDate(contact.lastInteractionAt),
  },
  {
    key: "zone",
    header: PERSON_FIELD_LABELS.zone,
    width: CONTACT_COLUMN_WIDTHS.zone,
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "zone"),
    cell: (contact) => labelBadge(contact.zone ? ZONE_LABELS[contact.zone] : null),
  },
  {
    key: "email",
    header: PERSON_FIELD_LABELS.email,
    width: CONTACT_COLUMN_WIDTHS.email,
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "email"),
    cell: (contact) => truncatedCell(contact.email),
  },
  {
    key: "phone",
    header: PERSON_FIELD_LABELS.phone,
    width: CONTACT_COLUMN_WIDTHS.phone,
    className: "tabular-nums",
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "phone"),
    cell: (contact) => truncatedCell(contact.phone),
  },
  {
    key: "linkedinUrl",
    header: PERSON_FIELD_LABELS.linkedinUrl,
    width: CONTACT_COLUMN_WIDTHS.linkedinUrl,
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "linkedinUrl"),
    cell: (contact) =>
      contact.linkedinUrl ? (
        <TruncateTooltip className="block w-full">
          <ExternalUrl url={contact.linkedinUrl} />
        </TruncateTooltip>
      ) : null,
  },
  {
    key: "reviewAt",
    header: CONTACT_FIELD_LABELS.reviewAt,
    width: CONTACT_COLUMN_WIDTHS.reviewAt,
    className: "tabular-nums text-muted-foreground",
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "reviewAt"),
    sortValue: (contact) => contact.reviewAt.getTime(),
    cell: (contact) => formatShortInstantDate(contact.reviewAt),
  },
  {
    key: "notes",
    header: PERSON_FIELD_LABELS.notes,
    width: CONTACT_COLUMN_WIDTHS.notes,
    className: "text-muted-foreground",
    ...hideableColumn(CONTACT_DEFAULT_VISIBLE_COLUMNS, "notes"),
    cell: (contact) => truncatedCell(contact.notes),
  },
]

const COLUMNS: readonly Column<AdminContact>[] = [...DATA_COLUMNS, actionsColumn(rowActions)]

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
    status: statusBadge(contact, { variant: "outline", meta: true }),
    sections: [
      {
        title: PERSON_SECTION_TITLES.person,
        rows: [
          {
            label: PERSON_FIELD_LABELS.companyId,
            value: contact.company ? (
              <Link
                href={detailHref(ADMIN_COMPANIES_PATH, contact.company.id)}
                className={STANDALONE_LINK_CLASS}
              >
                {contact.company.name}
              </Link>
            ) : null,
          },
          {
            label: PERSON_FIELD_LABELS.zone,
            value: labelBadge(contact.zone ? ZONE_LABELS[contact.zone] : null),
          },
        ],
      },
      {
        title: PERSON_SECTION_TITLES.contact,
        rows: [
          { label: PERSON_FIELD_LABELS.email, value: contact.email },
          { label: PERSON_FIELD_LABELS.phone, value: contact.phone },
          { label: PERSON_FIELD_LABELS.linkedinUrl, value: linkedinLink(contact), fullWidth: true },
        ],
      },
      {
        title: PERSON_SECTION_TITLES.details,
        rows: [
          {
            value: contact.details ? (
              <MarkdownContent markdown={contact.details} variant="admin" />
            ) : null,
            fullWidth: true,
          },
        ],
      },
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
            fullWidth: true,
          },
          {
            label: CONTACT_FIELD_LABELS.lastInteractionAt,
            value: formatShortInstantDate(contact.lastInteractionAt),
          },
          {
            label: CONTACT_FIELD_LABELS.reviewAt,
            value: formatShortInstantDate(contact.reviewAt),
          },
        ],
      },
      { title: PERSON_SECTION_TITLES.notes, rows: [{ value: contact.notes, fullWidth: true }] },
      {
        title: CONTACT_SECTION_TITLES.pipeline,
        rows: [
          {
            fullWidth: true,
            value: contact.leadRole ? (
              <RelatedLinksList
                links={[
                  {
                    id: contact.id,
                    href: detailHref(ADMIN_LEADS_PATH, contact.id),
                    label: "Fiche lead",
                    meta: pipelineMeta(contact.leadRole),
                  },
                ]}
              />
            ) : null,
          },
        ],
      },
    ],
    onEdit,
  }
}

const baseFacets: readonly Facet<AdminContact>[] = [
  {
    key: "types",
    label: CONTACT_FIELD_LABELS.types,
    options: CONTACT_TYPES.map((type) => ({ value: type, label: CONTACT_TYPE_LABELS[type] })),
    value: (contact) => contact.types,
  },
  {
    key: "status",
    label: CONTACT_FIELD_LABELS.status,
    options: CONTACT_STATUSES.map((status) => ({
      value: status,
      label: CONTACT_STATUS_LABELS[status],
    })),
    value: (contact) => contact.status,
  },
  {
    key: "zone",
    label: PERSON_FIELD_LABELS.zone,
    options: ZONES.map((zone) => ({ value: zone, label: ZONE_LABELS[zone] })),
    value: (contact) => (contact.zone ? [contact.zone] : []),
  },
]

function reviewFacet(now: Date): Facet<AdminContact> {
  return {
    key: "review",
    label: "Échéance",
    options: [{ value: "overdue", label: "Dépassée" }],
    value: (contact) => (contact.reviewAt < now ? ["overdue"] : []),
  }
}

interface Props {
  contacts: readonly AdminContact[]
  initialDetailId?: string
}

export function ContactsTable({ contacts, initialDetailId }: Props) {
  const router = useRouter()
  const [selectedContact, setSelectedContact] = useState<AdminContact | null>(
    () => contacts.find((contact) => contact.id === initialDetailId) ?? null,
  )
  // Instant figé au montage : le filtre d'échéance reste stable pendant la consultation.
  const [now] = useState(() => new Date())

  const facets = useMemo(() => [...baseFacets, reviewFacet(now)], [now])

  const detail = useMemo<DetailContent | null>(
    () =>
      selectedContact
        ? buildContactDetail(selectedContact, () => {
            router.push(`${ADMIN_CONTACTS_PATH}/${selectedContact.id}`)
          })
        : null,
    [selectedContact, router],
  )

  return (
    <>
      <DataTable
        rows={contacts}
        columns={COLUMNS}
        getRowId={(contact) => contact.id}
        searchPlaceholder="Rechercher un nom ou une entreprise"
        noun="contact"
        onRowClick={setSelectedContact}
        rowLabel={personDisplayName}
        facets={facets}
        empty={{
          icon: User,
          title: "Aucun contact",
          description: "Aucun contact pour le moment. Créez-en un via le bouton ci-dessus.",
        }}
      />
      <DetailDialog
        detail={detail}
        onOpenChange={(open) => {
          if (!open) setSelectedContact(null)
        }}
      />
    </>
  )
}
