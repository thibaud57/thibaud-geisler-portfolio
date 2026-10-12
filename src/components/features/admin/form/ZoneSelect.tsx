"use client"

import type { ComponentProps } from "react"

import { SelectField } from "@/components/features/admin/form/SelectField"
import { ZONE_LABELS, ZONES } from "@/lib/crm/zones"
import { PERSON_FIELD_LABELS } from "@/lib/crm/persons"
import { NONE_LABEL_FEMININE, NONE_VALUE } from "@/lib/schemas/none-value"

type Props = Omit<
  ComponentProps<typeof SelectField>,
  "name" | "label" | "options" | "labels" | "icons" | "noneLabel" | "defaultValue"
> & {
  name?: string
  label?: string
  defaultValue?: string | null
}

export function ZoneSelect({
  name = "zone",
  label = PERSON_FIELD_LABELS.zone,
  defaultValue,
  value,
  ...rest
}: Props) {
  return (
    <SelectField
      {...rest}
      name={name}
      label={label}
      options={ZONES}
      labels={ZONE_LABELS}
      noneLabel={NONE_LABEL_FEMININE}
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? NONE_VALUE) : undefined}
    />
  )
}
