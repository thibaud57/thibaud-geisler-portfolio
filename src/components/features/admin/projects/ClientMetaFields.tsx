"use client"

import { useId, useState } from "react"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { EnumSelectItems } from "@/components/features/admin/EnumSelectItems"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  PROJECT_FIELD_LABELS,
  WORK_MODE_LABELS,
  WORK_MODES,
} from "@/lib/projects"
import { NONE_VALUE } from "@/lib/schemas/project"
import type { CompanyOption } from "@/server/queries/companies"

type FieldKey = "companyId" | "workMode" | "contractStatus" | "teamSize" | "deliverablesCount"

interface Props {
  companies: readonly CompanyOption[]
  defaultValues: Partial<Record<FieldKey, string>>
  errors: Partial<Record<FieldKey, string[]>>
}

export function ClientMetaFields({ companies, defaultValues, errors }: Props) {
  const formId = useId()
  const [companyOpen, setCompanyOpen] = useState(false)
  const [companyId, setCompanyId] = useState(defaultValues.companyId ?? "")
  const selectedCompany = companies.find((company) => company.id === companyId)

  return (
    <div className="flex flex-col gap-4">
      <FormField
        id={`${formId}-companyId`}
        label={PROJECT_FIELD_LABELS.companyId}
        errors={errors.companyId}
      >
        <ComboboxPopover
          id={`${formId}-companyId`}
          open={companyOpen}
          onOpenChange={setCompanyOpen}
          triggerContent={
            <span className={selectedCompany ? undefined : "text-muted-foreground"}>
              {selectedCompany?.name ?? "Choisir une entreprise"}
            </span>
          }
          ariaInvalid={!!errors.companyId?.length}
          ariaDescribedby={`${formId}-companyId-error`}
          searchPlaceholder="Rechercher une entreprise…"
          emptyMessage="Aucune entreprise ne correspond."
        >
          <CommandGroup>
            {companies.map((company) => (
              <CommandItem
                key={company.id}
                value={company.id}
                keywords={[company.name]}
                data-checked={companyId === company.id}
                onSelect={() => {
                  setCompanyId(company.id)
                  setCompanyOpen(false)
                }}
              >
                {company.name}
              </CommandItem>
            ))}
          </CommandGroup>
        </ComboboxPopover>
        <input type="hidden" name="companyId" value={companyId} />
      </FormField>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id={`${formId}-workMode`}
          label={PROJECT_FIELD_LABELS.workMode}
          errors={errors.workMode}
        >
          <Select name="workMode" defaultValue={defaultValues.workMode ?? "REMOTE"}>
            <SelectTrigger
              id={`${formId}-workMode`}
              className="w-full"
              aria-invalid={!!errors.workMode?.length}
              aria-describedby={`${formId}-workMode-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <EnumSelectItems values={WORK_MODES} labels={WORK_MODE_LABELS} />
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          id={`${formId}-contractStatus`}
          label={PROJECT_FIELD_LABELS.contractStatus}
          errors={errors.contractStatus}
        >
          <Select name="contractStatus" defaultValue={defaultValues.contractStatus ?? NONE_VALUE}>
            <SelectTrigger
              id={`${formId}-contractStatus`}
              className="w-full"
              aria-invalid={!!errors.contractStatus?.length}
              aria-describedby={`${formId}-contractStatus-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NONE_VALUE}>Non renseigné</SelectItem>
              <EnumSelectItems values={CONTRACT_STATUSES} labels={CONTRACT_STATUS_LABELS} />
            </SelectContent>
          </Select>
        </FormField>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <FormField
          id={`${formId}-teamSize`}
          label={PROJECT_FIELD_LABELS.teamSize}
          errors={errors.teamSize}
        >
          <Input
            id={`${formId}-teamSize`}
            name="teamSize"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="10"
            defaultValue={defaultValues.teamSize ?? ""}
            aria-invalid={!!errors.teamSize?.length}
            aria-describedby={`${formId}-teamSize-error`}
            className="text-right tabular-nums"
          />
        </FormField>

        <FormField
          id={`${formId}-deliverablesCount`}
          label={PROJECT_FIELD_LABELS.deliverablesCount}
          errors={errors.deliverablesCount}
        >
          <Input
            id={`${formId}-deliverablesCount`}
            name="deliverablesCount"
            type="number"
            inputMode="numeric"
            min={1}
            placeholder="4"
            defaultValue={defaultValues.deliverablesCount ?? "1"}
            aria-invalid={!!errors.deliverablesCount?.length}
            aria-describedby={`${formId}-deliverablesCount-error`}
            className="text-right tabular-nums"
          />
        </FormField>
      </div>
    </div>
  )
}
