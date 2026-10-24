"use client"

import {
  SelectField,
  type NullableSelectFieldProps,
} from "@/components/features/admin/form/SelectField"
import type { JobRole } from "@/generated/prisma/client"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/crm/job-roles"
import { PERSON_FIELD_LABELS } from "@/lib/crm/persons"
import { NONE_LABEL } from "@/lib/schemas/none-value"

type Props = Omit<
  NullableSelectFieldProps<JobRole>,
  "name" | "label" | "options" | "labels" | "icons" | "noneLabel"
> & {
  name?: string
  label?: string
}

export function JobRoleSelect({
  name = "jobRole",
  label = PERSON_FIELD_LABELS.jobRole,
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
    />
  )
}
