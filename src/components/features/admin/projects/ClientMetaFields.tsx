"use client"

import { useId, useState } from "react"

import { CompanyCombobox } from "@/components/features/admin/form/CompanyCombobox"
import { NumberField } from "@/components/features/admin/form/NumberField"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { PROJECT_FIELD_LABELS as LABELS } from "@/lib/projects"
import {
  CONTRACT_STATUS_ICONS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  WORK_MODE_ICONS,
  WORK_MODE_LABELS,
  WORK_MODES,
} from "@/lib/contract-terms"
import { NONE_LABEL } from "@/lib/schemas/none-value"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminProjectDetail } from "@/server/queries/projects"

type FieldKey = "companyId" | "workMode" | "contractStatus" | "teamSize" | "deliverablesCount"

interface Props {
  companies: readonly CompanyOption[]
  clientMeta: AdminProjectDetail["clientMeta"] | undefined
  errors: Partial<Record<FieldKey, string[]>>
}

export function ClientMetaFields({ companies, clientMeta, errors }: Props) {
  const formId = useId()
  const [companyId, setCompanyId] = useState(clientMeta?.companyId ?? "")

  return (
    <div className="flex flex-col gap-4">
      <CompanyCombobox
        id={`${formId}-companyId`}
        label={LABELS.companyId}
        options={companies}
        value={companyId}
        onChange={setCompanyId}
        errors={errors.companyId}
        nullable={false}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField
          id={`${formId}-workMode`}
          name="workMode"
          label={LABELS.workMode}
          options={WORK_MODES}
          labels={WORK_MODE_LABELS}
          icons={WORK_MODE_ICONS}
          defaultValue={clientMeta?.workMode ?? "REMOTE"}
          errors={errors.workMode}
        />

        <SelectField
          id={`${formId}-contractStatus`}
          name="contractStatus"
          label={LABELS.contractStatus}
          options={CONTRACT_STATUSES}
          labels={CONTRACT_STATUS_LABELS}
          icons={CONTRACT_STATUS_ICONS}
          defaultValue={clientMeta?.contractStatus}
          errors={errors.contractStatus}
          noneLabel={NONE_LABEL}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          id={`${formId}-teamSize`}
          name="teamSize"
          label={LABELS.teamSize}
          min={1}
          placeholder="10"
          defaultValue={clientMeta?.teamSize?.toString() ?? ""}
          errors={errors.teamSize}
        />

        <NumberField
          id={`${formId}-deliverablesCount`}
          name="deliverablesCount"
          label={LABELS.deliverablesCount}
          min={1}
          placeholder="4"
          defaultValue={clientMeta?.deliverablesCount.toString() ?? "1"}
          errors={errors.deliverablesCount}
        />
      </div>
    </div>
  )
}
