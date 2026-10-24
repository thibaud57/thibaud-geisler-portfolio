"use client"

import {
  SelectField,
  type NullableSelectFieldProps,
} from "@/components/features/admin/form/SelectField"
import type { Zone } from "@/generated/prisma/client"
import { ZONE_LABELS, ZONES } from "@/lib/crm/zones"
import { PERSON_FIELD_LABELS } from "@/lib/crm/persons"
import { NONE_LABEL_FEMININE } from "@/lib/schemas/none-value"

type Props = Omit<
  NullableSelectFieldProps<Zone>,
  "name" | "label" | "options" | "labels" | "icons" | "noneLabel"
> & {
  name?: string
  label?: string
}

export function ZoneSelect({ name = "zone", label = PERSON_FIELD_LABELS.zone, ...rest }: Props) {
  return (
    <SelectField
      {...rest}
      name={name}
      label={label}
      options={ZONES}
      labels={ZONE_LABELS}
      noneLabel={NONE_LABEL_FEMININE}
    />
  )
}
