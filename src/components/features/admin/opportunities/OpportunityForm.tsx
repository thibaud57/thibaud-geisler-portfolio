"use client"

import { useActionState, useId, useState } from "react"
import { useRouter } from "next/navigation"

import { CompanyCombobox } from "@/components/features/admin/form/CompanyCombobox"
import { DetailsCard } from "@/components/features/admin/form/DetailsCard"
import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormCard } from "@/components/features/admin/form/FormCard"
import { FormPage } from "@/components/features/admin/form/FormPage"
import { MonthField } from "@/components/features/admin/opportunities/MonthField"
import { NotesCard } from "@/components/features/admin/form/NotesCard"
import { NumberField } from "@/components/features/admin/form/NumberField"
import { PersonCombobox } from "@/components/features/admin/form/PersonCombobox"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { ZoneSelect } from "@/components/features/admin/form/ZoneSelect"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import { isEsn } from "@/lib/crm/companies"
import { OPPORTUNITY_DETAILS_TEMPLATE } from "@/lib/crm/details-templates"
import {
  formatDays,
  OPPORTUNITY_FIELD_LABELS as LABELS,
  OPPORTUNITY_SECTION_TITLES,
  OPPORTUNITY_STATUS_ICONS,
  OPPORTUNITY_STATUS_LABELS,
  toMonthValue,
} from "@/lib/crm/opportunities"
import { personDisplayName } from "@/lib/crm/persons"
import {
  CONTRACT_STATUS_ICONS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  WORK_MODE_ICONS,
  WORK_MODE_LABELS,
  WORK_MODES,
} from "@/lib/contract-terms"
import { NONE_LABEL, NONE_VALUE } from "@/lib/schemas/none-value"
import { DAYS_PER_WEEK, ON_SITE_DAYS, OPPORTUNITY_STATUSES } from "@/lib/schemas/opportunity"
import { createOpportunity, updateOpportunity } from "@/server/actions/opportunities"
import { initialOpportunityFormState } from "@/server/actions/opportunities.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminOpportunity } from "@/server/queries/opportunities"
import type { PersonOption } from "@/server/queries/persons"

const DAY_LABELS: Record<string, string> = Object.fromEntries(
  ON_SITE_DAYS.map((days) => [days, formatDays(Number(days))]),
)

interface Props {
  opportunity: AdminOpportunity | null
  referrerOptions: readonly PersonOption[]
  companyOptions: readonly CompanyOption[]
  defaultReferrerId?: string
  relatedCards?: React.ReactNode
}

export function OpportunityForm({
  opportunity,
  referrerOptions,
  companyOptions,
  defaultReferrerId,
  relatedCards,
}: Props) {
  const router = useRouter()
  const formId = useId()
  const action = opportunity ? updateOpportunity.bind(null, opportunity.id) : createOpportunity
  const [state, formAction, pending] = useActionState(action, initialOpportunityFormState)
  const handleSubmit = useFormActionSubmit(formAction)

  const [referrerId, setReferrerId] = useState(
    (opportunity ? opportunity.referrerId : defaultReferrerId) ?? NONE_VALUE,
  )
  const [intermediaryId, setIntermediaryId] = useState(opportunity?.intermediaryId ?? NONE_VALUE)
  const [clientId, setClientId] = useState(opportunity?.clientId ?? NONE_VALUE)
  // Le gabarit ne se pose qu'à la création : un Détails vidé exprès reste vide.
  const [details, setDetails] = useState(
    opportunity ? (opportunity.details ?? "") : OPPORTUNITY_DETAILS_TEMPLATE,
  )

  useSaveFeedback(state, {
    saved: opportunity ? "Opportunité mise à jour" : "Opportunité créée",
    onSaved: () => {
      router.push(ADMIN_OPPORTUNITIES_PATH)
    },
    gone: { code: "opportunity_not_found", toast: "Cette opportunité a été supprimée" },
  })

  // L'ESN déjà reliée peut ne plus en être une (type changé) : elle reste dans les choix pour garder son nom affiché.
  const esnOptions = companyOptions.filter(
    (company) => company.id === opportunity?.intermediaryId || isEsn(company),
  )
  const clientOptions = companyOptions.filter((company) => company.id !== intermediaryId)
  // L'apporteur peut être sorti des choix (opposition) : son nom reste affiché.
  const currentReferrer = opportunity?.referrer
    ? { id: opportunity.referrer.id, name: personDisplayName(opportunity.referrer) }
    : null

  function handleIntermediaryChange(next: string) {
    setIntermediaryId(next)
    // Une même entreprise ne peut pas être l'ESN et le client final.
    if (next !== NONE_VALUE && next === clientId) setClientId(NONE_VALUE)
  }

  return (
    <FormPage
      title={opportunity ? opportunity.title : "Nouvelle opportunité"}
      cancelHref={ADMIN_OPPORTUNITIES_PATH}
      pending={pending}
      onSubmit={handleSubmit}
      main={
        <>
          <FormCard title={OPPORTUNITY_SECTION_TITLES.opportunity} columns={2}>
            <div className="sm:col-span-2">
              <FieldInput
                id={`${formId}-title`}
                name="title"
                label={LABELS.title}
                defaultValue={opportunity?.title ?? ""}
                placeholder="Refonte d'application"
                errors={state.errors.title}
              />
            </div>

            <FieldInput
              id={`${formId}-role`}
              name="role"
              label={LABELS.role}
              defaultValue={opportunity?.role ?? ""}
              placeholder="Développeur full-stack"
              errors={state.errors.role}
            />

            <SelectField
              id={`${formId}-status`}
              name="status"
              label={LABELS.status}
              options={OPPORTUNITY_STATUSES}
              labels={OPPORTUNITY_STATUS_LABELS}
              icons={OPPORTUNITY_STATUS_ICONS}
              defaultValue={opportunity?.status ?? "PROPOSEE"}
              errors={state.errors.status}
            />
          </FormCard>

          <FormCard title={OPPORTUNITY_SECTION_TITLES.relations} columns={2}>
            <div className="sm:col-span-2">
              <PersonCombobox
                id={`${formId}-referrerId`}
                name="referrerId"
                label={LABELS.referrerId}
                options={referrerOptions}
                value={referrerId}
                onChange={setReferrerId}
                errors={state.errors.referrerId}
                nullable
                selectedFallback={currentReferrer}
                searchPlaceholder="Chercher un apporteur"
                emptyMessage="Aucun apporteur ne correspond."
              />
            </div>

            <CompanyCombobox
              id={`${formId}-intermediaryId`}
              label={LABELS.intermediaryId}
              name="intermediaryId"
              options={esnOptions}
              value={intermediaryId}
              onChange={handleIntermediaryChange}
              errors={state.errors.intermediaryId}
            />

            <CompanyCombobox
              id={`${formId}-clientId`}
              label={LABELS.clientId}
              name="clientId"
              options={clientOptions}
              value={clientId}
              onChange={setClientId}
              errors={state.errors.clientId}
            />
          </FormCard>

          <DetailsCard
            formId={formId}
            title={OPPORTUNITY_SECTION_TITLES.details}
            value={details}
            onChange={setDetails}
            errors={state.errors.details}
          />

          {relatedCards}
        </>
      }
      aside={
        <>
          <FormCard title={OPPORTUNITY_SECTION_TITLES.conditions} columns={2}>
            <NumberField
              id={`${formId}-dailyRate`}
              name="dailyRate"
              label={LABELS.dailyRate}
              min={1}
              step={10}
              defaultValue={opportunity?.dailyRate?.toString() ?? ""}
              placeholder="650"
              errors={state.errors.dailyRate}
            />

            <SelectField
              id={`${formId}-contract`}
              name="contract"
              label={LABELS.contract}
              options={CONTRACT_STATUSES}
              labels={CONTRACT_STATUS_LABELS}
              icons={CONTRACT_STATUS_ICONS}
              defaultValue={opportunity?.contract ?? NONE_VALUE}
              errors={state.errors.contract}
              noneLabel={NONE_LABEL}
            />

            <SelectField
              id={`${formId}-workMode`}
              name="workMode"
              label={LABELS.workMode}
              options={WORK_MODES}
              labels={WORK_MODE_LABELS}
              icons={WORK_MODE_ICONS}
              defaultValue={opportunity?.workMode ?? NONE_VALUE}
              errors={state.errors.workMode}
              noneLabel={NONE_LABEL}
            />

            <ZoneSelect
              id={`${formId}-zone`}
              label={LABELS.zone}
              defaultValue={opportunity?.zone}
              errors={state.errors.zone}
            />

            <SelectField
              id={`${formId}-daysPerWeek`}
              name="daysPerWeek"
              label={LABELS.daysPerWeek}
              options={DAYS_PER_WEEK}
              labels={DAY_LABELS}
              defaultValue={opportunity?.daysPerWeek?.toString() ?? NONE_VALUE}
              errors={state.errors.daysPerWeek}
              noneLabel={NONE_LABEL}
            />

            <SelectField
              id={`${formId}-onSiteDays`}
              name="onSiteDays"
              label={LABELS.onSiteDays}
              options={ON_SITE_DAYS}
              labels={DAY_LABELS}
              defaultValue={opportunity?.onSiteDays?.toString() ?? NONE_VALUE}
              errors={state.errors.onSiteDays}
              noneLabel={NONE_LABEL}
            />
          </FormCard>

          <FormCard title={OPPORTUNITY_SECTION_TITLES.calendar} columns={2}>
            <MonthField
              id={`${formId}-startMonth`}
              name="startMonth"
              label={LABELS.startMonth}
              errors={state.errors.startMonth}
              defaultValue={opportunity?.startMonth ? toMonthValue(opportunity.startMonth) : ""}
            />

            <NumberField
              id={`${formId}-durationMonths`}
              name="durationMonths"
              label={LABELS.durationMonths}
              min={1}
              max={60}
              defaultValue={opportunity?.durationMonths?.toString() ?? ""}
              errors={state.errors.durationMonths}
            />
          </FormCard>

          <NotesCard
            formId={formId}
            title={OPPORTUNITY_SECTION_TITLES.notes}
            errors={state.errors.notes}
            defaultValue={opportunity?.notes}
          />
        </>
      }
    />
  )
}
