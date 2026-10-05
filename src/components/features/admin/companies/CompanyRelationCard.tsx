"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { CompanySize, RelationStatus } from "@/generated/prisma/client"
import {
  COMPANY_FIELD_LABELS,
  COMPANY_SECTION_TITLES,
  COMPANY_SIZE_LABELS,
  COMPANY_STATUS_ICONS,
  RELATION_STATUS_LABELS,
} from "@/lib/companies"
import { COMPANY_SIZES, NONE_VALUE, RELATION_STATUSES } from "@/lib/schemas/company"
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
    <Card>
      <CardHeader>
        <CardTitle>{COMPANY_SECTION_TITLES.relation}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2">
        <FormField
          id={`${formId}-relationStatus`}
          label={COMPANY_FIELD_LABELS.relationStatus}
          errors={errors.relationStatus}
        >
          <Select name="relationStatus" defaultValue={defaults.relationStatus}>
            <SelectTrigger
              id={`${formId}-relationStatus`}
              className="w-full"
              aria-invalid={!!errors.relationStatus?.length}
              aria-describedby={`${formId}-relationStatus-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RELATION_STATUSES.map((status) => {
                const Icon = COMPANY_STATUS_ICONS[status]
                return (
                  <SelectItem key={status} value={status}>
                    {Icon ? <Icon aria-hidden data-icon="inline-start" /> : null}
                    {RELATION_STATUS_LABELS[status]}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </FormField>

        <FormField id={`${formId}-size`} label={COMPANY_FIELD_LABELS.size} errors={errors.size}>
          <Select name="size" defaultValue={defaults.size ?? NONE_VALUE}>
            <SelectTrigger
              id={`${formId}-size`}
              className="w-full"
              aria-invalid={!!errors.size?.length}
              aria-describedby={`${formId}-size-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Non renseignée</SelectItem>
              {COMPANY_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {COMPANY_SIZE_LABELS[size]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>
      </CardContent>
    </Card>
  )
}
