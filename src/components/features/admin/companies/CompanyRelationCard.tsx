"use client"

import { FormCard } from "@/components/features/admin/form/FormCard"
import { SelectField } from "@/components/features/admin/form/SelectField"

import type { CompanySize, RelationStatus } from "@/generated/prisma/client"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SIZE_LABELS,
  COMPANY_STATUS_ICONS,
  RELATION_STATUS_LABELS,
} from "@/lib/crm/companies"
import { COMPANY_SIZES, RELATION_STATUSES } from "@/lib/schemas/company"
import { NONE_LABEL_FEMININE, NONE_VALUE } from "@/lib/schemas/none-value"
import type { CompanyFormState } from "@/server/actions/companies.types"

interface Props {
  formId: string
  errors: CompanyFormState["errors"]
  defaults: {
    relationStatus: RelationStatus
    size: CompanySize | null
  }
}

export function CompanyRelationCard({ formId, errors, defaults }: Props) {
  return (
    <FormCard title={COMPANY_SECTION_TITLES.relation} columns={2}>
      <SelectField
        id={`${formId}-relationStatus`}
        name="relationStatus"
        label={COMPANY_FIELD_LABELS.relationStatus}
        options={RELATION_STATUSES}
        labels={RELATION_STATUS_LABELS}
        icons={COMPANY_STATUS_ICONS}
        defaultValue={defaults.relationStatus}
        errors={errors.relationStatus}
      />

      <SelectField
        id={`${formId}-size`}
        name="size"
        label={COMPANY_FIELD_LABELS.size}
        options={COMPANY_SIZES}
        labels={COMPANY_SIZE_LABELS}
        defaultValue={defaults.size ?? NONE_VALUE}
        errors={errors.size}
        noneLabel={NONE_LABEL_FEMININE}
      />
    </FormCard>
  )
}
