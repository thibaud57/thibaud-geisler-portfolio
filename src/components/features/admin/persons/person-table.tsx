import type { ComponentProps } from "react"

import { CompanyLogoTile } from "@/components/features/admin/display/CompanyLogoTile"
import { ExternalUrl } from "@/components/features/admin/display/ExternalUrl"
import { TitleCell } from "@/components/features/admin/table/TitleCell"
import type { DetailSection } from "@/components/features/admin/detail/DetailDialog"
import type { Column } from "@/components/features/admin/table/DataTable"
import { enumFacet, hideableColumn } from "@/components/features/admin/table/table-cells"
import { zoneBadge } from "@/components/features/admin/display/badges"
import {
  companyCell,
  linkedinLink,
  PersonRecordLink,
  RecordLink,
} from "@/components/features/admin/display/record-links"
import { truncatedCell } from "@/components/features/admin/table/table-cells"
import { TruncateTooltip } from "@/components/features/admin/display/TruncateTooltip"
import type { Zone } from "@/generated/prisma/client"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/crm/persons"
import { ZONE_LABELS, ZONES } from "@/lib/crm/zones"
import type { Facet } from "@/lib/admin/facets"
import type { CompanyRef } from "@/server/queries/company-ref"

interface PersonRow {
  name: string | null
  email: string | null
  linkedinUrl: string | null
  phone: string | null
  notes: string | null
  zone: Zone | null
  company: CompanyRef | null
}

type PersonColumnKey = "name" | "zone" | "linkedinUrl" | "email" | "phone" | "notes"

export function personColumns<T extends PersonRow>(
  widths: Record<PersonColumnKey, number>,
  visible: readonly string[],
): Record<PersonColumnKey, Column<T>> {
  return {
    name: {
      key: "name",
      header: PERSON_FIELD_LABELS.name,
      width: widths.name,
      sortValue: (person) => personDisplayName(person),
      searchValue: (person) => `${personDisplayName(person)} ${person.company?.name ?? ""}`,
      cell: (person) => (
        <TitleCell
          title={personDisplayName(person)}
          subtitle={person.company?.name}
          leading={<CompanyLogoTile logoFilename={person.company?.logoFilename ?? null} />}
        />
      ),
    },
    zone: {
      key: "zone",
      header: PERSON_FIELD_LABELS.zone,
      width: widths.zone,
      ...hideableColumn(visible, "zone"),
      cell: zoneBadge,
    },
    linkedinUrl: {
      key: "linkedinUrl",
      header: PERSON_FIELD_LABELS.linkedinUrl,
      width: widths.linkedinUrl,
      ...hideableColumn(visible, "linkedinUrl"),
      cell: (person) =>
        person.linkedinUrl ? (
          <TruncateTooltip className="block w-full">
            <ExternalUrl url={person.linkedinUrl} />
          </TruncateTooltip>
        ) : null,
    },
    email: {
      key: "email",
      header: PERSON_FIELD_LABELS.email,
      width: widths.email,
      ...hideableColumn(visible, "email"),
      cell: (person) => truncatedCell(person.email),
    },
    phone: {
      key: "phone",
      header: PERSON_FIELD_LABELS.phone,
      width: widths.phone,
      className: "tabular-nums",
      ...hideableColumn(visible, "phone"),
      cell: (person) => truncatedCell(person.phone),
    },
    notes: {
      key: "notes",
      header: PERSON_FIELD_LABELS.notes,
      width: widths.notes,
      className: "text-muted-foreground",
      ...hideableColumn(visible, "notes"),
      cell: (person) => truncatedCell(person.notes),
    },
  }
}

export function personDetailSections(
  person: Pick<PersonRow, "name" | "zone" | "email" | "phone" | "linkedinUrl" | "company">,
  otherRole: { label: string; href: ComponentProps<typeof RecordLink>["href"] },
): [DetailSection, DetailSection] {
  return [
    {
      title: PERSON_SECTION_TITLES.person,
      rows: [
        {
          label: PERSON_FIELD_LABELS.companyId,
          value: companyCell(person),
        },
        { label: PERSON_FIELD_LABELS.zone, value: zoneBadge(person) },
        {
          label: otherRole.label,
          value: otherRole.href ? <PersonRecordLink person={person} href={otherRole.href} /> : null,
        },
      ],
    },
    {
      title: PERSON_SECTION_TITLES.contact,
      rows: [
        { label: PERSON_FIELD_LABELS.email, value: person.email },
        { label: PERSON_FIELD_LABELS.phone, value: person.phone },
        { label: PERSON_FIELD_LABELS.linkedinUrl, value: linkedinLink(person) },
      ],
    },
  ]
}

export function zoneFacet<T extends { zone: Zone | null }>(): Facet<T> {
  return enumFacet<T, Zone>(
    "zone",
    PERSON_FIELD_LABELS.zone,
    ZONES,
    ZONE_LABELS,
    (person) => person.zone,
  )
}

// Les contacts n'ont pas d'échéance : le réseau n'a aucune durée légale, seuls les leads lisent `overdue`.
export function personFacets<T extends { zone: Zone | null }>(isOverdue: (row: T) => boolean) {
  const zone = zoneFacet<T>()
  const overdue: Facet<T> = {
    key: "overdue",
    label: "Échéance",
    options: [{ value: "overdue", label: "Dépassée" }],
    value: (person) => (isOverdue(person) ? ["overdue"] : []),
  }
  return { zone, overdue }
}
