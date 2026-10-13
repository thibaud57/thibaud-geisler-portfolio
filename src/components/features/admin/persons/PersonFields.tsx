"use client"

import { useState, type ComponentProps, type ReactNode } from "react"

import { EmptyValue } from "@/components/features/admin/EmptyValue"
import { CompanyCombobox } from "@/components/features/admin/form/CompanyCombobox"
import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormCard } from "@/components/features/admin/form/FormCard"
import { JobRoleSelect } from "@/components/features/admin/form/JobRoleSelect"
import { MirroredField } from "@/components/features/admin/form/MirroredField"
import { ZoneSelect } from "@/components/features/admin/form/ZoneSelect"
import { PersonRecordLink } from "@/components/features/admin/table/table-cells"
import type { JobRole, Zone } from "@/generated/prisma/client"
import { JOB_ROLE_LABELS } from "@/lib/crm/job-roles"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES } from "@/lib/crm/persons"
import { ZONE_LABELS } from "@/lib/crm/zones"
import { NONE_LABEL, NONE_LABEL_FEMININE, NONE_VALUE } from "@/lib/schemas/none-value"
import type { CompanyOption } from "@/server/queries/companies"
import type { AttachableLead } from "@/server/queries/persons"

interface PersonDefaults {
  name: string | null
  jobRole: JobRole | null
  zone: Zone | null
  email: string | null
  phone: string | null
  linkedinUrl: string | null
  company: { id: string; logoFilename: string | null } | null
}

type PersonFieldName = "name" | "jobRole" | "zone" | "companyId" | "email" | "phone" | "linkedinUrl"

interface Props {
  formId: string
  companyOptions: readonly CompanyOption[]
  defaults: PersonDefaults | null
  errors: Partial<Record<PersonFieldName, string[]>>
  mirror?: { lead: AttachableLead | null; loading: boolean }
  identityHeader?: ReactNode
  // L'autre rôle de la personne, en lecture : la page de modification montre ce que montre la vue détail.
  otherRole?: { label: string; href: ComponentProps<typeof PersonRecordLink>["href"] }
}

export function PersonFields({
  formId,
  companyOptions,
  defaults,
  errors,
  mirror,
  identityHeader,
  otherRole,
}: Props) {
  const [companyId, setCompanyId] = useState(defaults?.company?.id ?? NONE_VALUE)
  const mirrored = mirror !== undefined

  function mirrorOf(
    field: PersonFieldName,
    value: (lead: AttachableLead) => string,
  ): { id: string; label: string; value: string; loading: boolean } {
    return {
      id: `${formId}-lead-${field}`,
      label: PERSON_FIELD_LABELS[field],
      value: mirror?.lead ? value(mirror.lead) : "",
      loading: mirror?.loading ?? false,
    }
  }

  return (
    <>
      <FormCard title={PERSON_SECTION_TITLES.person} columns={2}>
        {identityHeader ? <div className="grid gap-4 sm:col-span-2">{identityHeader}</div> : null}

        <MirroredField mirrored={mirrored} mirror={mirrorOf("name", (lead) => lead.name ?? "")}>
          <FieldInput
            id={`${formId}-name`}
            name="name"
            label={PERSON_FIELD_LABELS.name}
            defaultValue={defaults?.name ?? ""}
            placeholder="Jeanne Dupont"
            errors={errors.name}
          />
        </MirroredField>

        <MirroredField
          mirrored={mirrored}
          mirror={mirrorOf("jobRole", (lead) =>
            lead.jobRole ? JOB_ROLE_LABELS[lead.jobRole] : NONE_LABEL,
          )}
        >
          <JobRoleSelect
            id={`${formId}-jobRole`}
            defaultValue={defaults?.jobRole}
            errors={errors.jobRole}
          />
        </MirroredField>

        <MirroredField
          mirrored={mirrored}
          mirror={mirrorOf("companyId", (lead) => lead.company?.name ?? "Aucune")}
        >
          <CompanyCombobox
            id={`${formId}-companyId`}
            options={companyOptions}
            value={companyId}
            onChange={setCompanyId}
            errors={errors.companyId}
          />
        </MirroredField>

        <MirroredField
          mirrored={mirrored}
          mirror={mirrorOf("zone", (lead) =>
            lead.zone ? ZONE_LABELS[lead.zone] : NONE_LABEL_FEMININE,
          )}
        >
          <ZoneSelect id={`${formId}-zone`} defaultValue={defaults?.zone} errors={errors.zone} />
        </MirroredField>
        {otherRole ? (
          <div className="flex flex-col gap-2 sm:col-span-2">
            <span className="text-sm leading-none font-medium">{otherRole.label}</span>
            <span className="flex min-h-9 items-center text-sm">
              {defaults && otherRole.href ? (
                <PersonRecordLink person={defaults} href={otherRole.href} />
              ) : (
                <EmptyValue />
              )}
            </span>
          </div>
        ) : null}
      </FormCard>

      <FormCard title={PERSON_SECTION_TITLES.contact} columns={2}>
        <MirroredField mirrored={mirrored} mirror={mirrorOf("email", (lead) => lead.email ?? "")}>
          <FieldInput
            id={`${formId}-email`}
            name="email"
            label={PERSON_FIELD_LABELS.email}
            type="email"
            defaultValue={defaults?.email ?? ""}
            placeholder="jeanne@acme.example"
            errors={errors.email}
          />
        </MirroredField>

        <MirroredField mirrored={mirrored} mirror={mirrorOf("phone", (lead) => lead.phone ?? "")}>
          <FieldInput
            id={`${formId}-phone`}
            name="phone"
            label={PERSON_FIELD_LABELS.phone}
            type="tel"
            defaultValue={defaults?.phone ?? ""}
            placeholder="+33 6 …"
            errors={errors.phone}
          />
        </MirroredField>

        <MirroredField
          mirrored={mirrored}
          mirror={mirrorOf("linkedinUrl", (lead) => lead.linkedinUrl ?? "")}
          fullWidth
        >
          <FieldInput
            id={`${formId}-linkedinUrl`}
            name="linkedinUrl"
            label={PERSON_FIELD_LABELS.linkedinUrl}
            type="url"
            defaultValue={defaults?.linkedinUrl ?? ""}
            placeholder="linkedin.com/in/…"
            errors={errors.linkedinUrl}
          />
        </MirroredField>
      </FormCard>
    </>
  )
}
