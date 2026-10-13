"use client"

import type { ComponentProps } from "react"

import { SelectField } from "@/components/features/admin/form/SelectField"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/crm/job-roles"
import { PERSON_FIELD_LABELS } from "@/lib/crm/persons"
import { NONE_LABEL, NONE_VALUE } from "@/lib/schemas/none-value"

type Props = Omit<
  ComponentProps<typeof SelectField>,
  "name" | "label" | "options" | "labels" | "icons" | "noneLabel" | "defaultValue"
> & {
  name?: string
  label?: string
  defaultValue?: string | null
}

export function JobRoleSelect({
  name = "jobRole",
  label = PERSON_FIELD_LABELS.jobRole,
  defaultValue,
  value,
  ...rest
}: Props) {
  return (
    <SelectField
      {...rest}
      name={name}
      label={label}
      options={JOB_ROLES}
      labels={JOB_ROLE_LABELS}
      noneLabel={NONE_LABEL}
      value={value}
      defaultValue={value === undefined ? (defaultValue ?? NONE_VALUE) : undefined}
    />
  )
}
