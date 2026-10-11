"use client"

import { useActionState, useEffect, useId, useState } from "react"
import { Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { CompanyCombobox } from "@/components/features/admin/CompanyCombobox"
import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { MonthField } from "@/components/features/admin/MonthField"
import { SelectField } from "@/components/features/admin/SelectField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { Editor } from "@/components/ui/editor"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin-routes"
import { isEsn } from "@/lib/companies"
import { DETAILS_EDITOR_HELP, OPPORTUNITY_DETAILS_TEMPLATE } from "@/lib/details-templates"
import {
  formatDays,
  OPPORTUNITY_FIELD_LABELS as LABELS,
  OPPORTUNITY_SECTION_TITLES,
  OPPORTUNITY_STATUS_ICONS,
  OPPORTUNITY_STATUS_LABELS,
  toMonthValue,
} from "@/lib/opportunities"
import { personDisplayName } from "@/lib/persons"
import {
  CONTRACT_STATUS_ICONS,
  CONTRACT_STATUS_LABELS,
  CONTRACT_STATUSES,
  WORK_MODE_ICONS,
  WORK_MODE_LABELS,
  WORK_MODES,
} from "@/lib/projects"
import { DAYS_PER_WEEK, ON_SITE_DAYS, OPPORTUNITY_STATUSES } from "@/lib/schemas/opportunity"
import { NONE_VALUE } from "@/lib/schemas/person"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
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
  relatedCards?: React.ReactNode
}

export function OpportunityForm({
  opportunity,
  referrerOptions,
  companyOptions,
  relatedCards,
}: Props) {
  const router = useRouter()
  const formId = useId()
  const action = opportunity ? updateOpportunity.bind(null, opportunity.id) : createOpportunity
  const [state, formAction, pending] = useActionState(action, initialOpportunityFormState)
  const handleSubmit = useFormActionSubmit(formAction)

  const [referrerId, setReferrerId] = useState(opportunity?.referrerId ?? NONE_VALUE)
  const [referrerOpen, setReferrerOpen] = useState(false)
  const [intermediaryId, setIntermediaryId] = useState(opportunity?.intermediaryId ?? NONE_VALUE)
  const [clientId, setClientId] = useState(opportunity?.clientId ?? NONE_VALUE)
  // Le gabarit ne se pose qu'à la création : un Détails vidé exprès reste vide.
  const [details, setDetails] = useState(
    opportunity ? (opportunity.details ?? "") : OPPORTUNITY_DETAILS_TEMPLATE,
  )

  // Un booléen plutôt que `opportunity` en dépendance : chaque revalidation livre un nouvel objet, qui rejouerait le toast du dernier état.
  const isEdit = opportunity !== null

  // L'ESN déjà reliée peut ne plus en être une (type changé) : elle reste dans les choix pour garder son nom affiché.
  const esnOptions = companyOptions.filter(
    (company) => company.id === opportunity?.intermediaryId || isEsn(company),
  )
  const clientOptions = companyOptions.filter((company) => company.id !== intermediaryId)
  // L'apporteur peut être sorti des choix (opposition) : son nom reste affiché.
  const selectedReferrerLabel =
    referrerOptions.find((option) => option.id === referrerId)?.name ??
    (opportunity?.referrer?.id === referrerId ? personDisplayName(opportunity.referrer) : null)

  function handleIntermediaryChange(next: string) {
    setIntermediaryId(next)
    // Une même entreprise ne peut pas être l'ESN et le client final.
    if (next !== NONE_VALUE && next === clientId) setClientId(NONE_VALUE)
  }

  useEffect(() => {
    if (state.ok === true) {
      toast.success(isEdit ? "Opportunité mise à jour" : "Opportunité créée")
      router.push(ADMIN_OPPORTUNITIES_PATH)
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, isEdit, router])

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {opportunity ? opportunity.title : "Nouvelle opportunité"}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href={ADMIN_OPPORTUNITIES_PATH}>Annuler</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            <Save aria-hidden data-icon="inline-start" />
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.opportunity}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField id={`${formId}-title`} label={LABELS.title} errors={state.errors.title}>
                  <Input
                    id={`${formId}-title`}
                    name="title"
                    defaultValue={opportunity?.title ?? ""}
                    placeholder="Refonte d'application"
                    aria-invalid={!!state.errors.title?.length}
                    aria-describedby={`${formId}-title-error`}
                  />
                </FormField>
              </div>

              <FormField id={`${formId}-role`} label={LABELS.role} errors={state.errors.role}>
                <Input
                  id={`${formId}-role`}
                  name="role"
                  defaultValue={opportunity?.role ?? ""}
                  placeholder="Développeur full-stack"
                  aria-invalid={!!state.errors.role?.length}
                  aria-describedby={`${formId}-role-error`}
                />
              </FormField>

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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.relations}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField
                  id={`${formId}-referrerId`}
                  label={LABELS.referrerId}
                  errors={state.errors.referrerId}
                >
                  <ComboboxPopover
                    id={`${formId}-referrerId`}
                    open={referrerOpen}
                    onOpenChange={setReferrerOpen}
                    triggerContent={
                      selectedReferrerLabel ? (
                        <span className="truncate">{selectedReferrerLabel}</span>
                      ) : (
                        <span className="text-muted-foreground">Aucun</span>
                      )
                    }
                    ariaInvalid={!!state.errors.referrerId?.length}
                    ariaDescribedby={`${formId}-referrerId-error`}
                    searchPlaceholder="Chercher un apporteur"
                    emptyMessage="Aucun apporteur ne correspond."
                  >
                    <CommandGroup>
                      <CommandItem
                        value={NONE_VALUE}
                        keywords={["Aucun"]}
                        data-checked={referrerId === NONE_VALUE}
                        onSelect={() => {
                          setReferrerId(NONE_VALUE)
                          setReferrerOpen(false)
                        }}
                      >
                        Aucun
                      </CommandItem>
                      {referrerOptions.map((person) => (
                        <CommandItem
                          key={person.id}
                          value={person.id}
                          keywords={[person.name, person.company?.name ?? ""]}
                          data-checked={referrerId === person.id}
                          onSelect={() => {
                            setReferrerId(person.id)
                            setReferrerOpen(false)
                          }}
                        >
                          <span className="truncate">{person.name}</span>
                          {person.company ? (
                            <span className="truncate text-muted-foreground">
                              {person.company.name}
                            </span>
                          ) : null}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </ComboboxPopover>
                  <input type="hidden" name="referrerId" value={referrerId} />
                </FormField>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-details-title`}>
                {OPPORTUNITY_SECTION_TITLES.details}
              </CardTitle>
              <CardDescription>{DETAILS_EDITOR_HELP}</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField id={`${formId}-details`} errors={state.errors.details}>
                <Editor
                  id={`${formId}-details`}
                  aria-labelledby={`${formId}-details-title`}
                  format="markdown"
                  enableImages={false}
                  value={details}
                  onChange={setDetails}
                  aria-invalid={!!state.errors.details?.length}
                  aria-describedby={`${formId}-details-error`}
                />
                <input type="hidden" name="details" value={details} />
              </FormField>
            </CardContent>
          </Card>

          {relatedCards}
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">
          <Card>
            <CardHeader>
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.conditions}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={`${formId}-dailyRate`}
                label={LABELS.dailyRate}
                errors={state.errors.dailyRate}
              >
                <Input
                  id={`${formId}-dailyRate`}
                  name="dailyRate"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={10}
                  defaultValue={opportunity?.dailyRate?.toString() ?? ""}
                  placeholder="650"
                  className="text-right tabular-nums"
                  aria-invalid={!!state.errors.dailyRate?.length}
                  aria-describedby={`${formId}-dailyRate-error`}
                />
              </FormField>

              <SelectField
                id={`${formId}-contract`}
                name="contract"
                label={LABELS.contract}
                options={CONTRACT_STATUSES}
                labels={CONTRACT_STATUS_LABELS}
                icons={CONTRACT_STATUS_ICONS}
                defaultValue={opportunity?.contract ?? NONE_VALUE}
                errors={state.errors.contract}
                noneLabel="Non renseigné"
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
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-zone`}
                name="zone"
                label={LABELS.zone}
                options={ZONES}
                labels={ZONE_LABELS}
                defaultValue={opportunity?.zone ?? NONE_VALUE}
                errors={state.errors.zone}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-daysPerWeek`}
                name="daysPerWeek"
                label={LABELS.daysPerWeek}
                options={DAYS_PER_WEEK}
                labels={DAY_LABELS}
                defaultValue={opportunity?.daysPerWeek?.toString() ?? NONE_VALUE}
                errors={state.errors.daysPerWeek}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-onSiteDays`}
                name="onSiteDays"
                label={LABELS.onSiteDays}
                options={ON_SITE_DAYS}
                labels={DAY_LABELS}
                defaultValue={opportunity?.onSiteDays?.toString() ?? NONE_VALUE}
                errors={state.errors.onSiteDays}
                noneLabel="Non renseigné"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{OPPORTUNITY_SECTION_TITLES.calendar}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <MonthField
                id={`${formId}-startMonth`}
                name="startMonth"
                label={LABELS.startMonth}
                errors={state.errors.startMonth}
                defaultValue={opportunity?.startMonth ? toMonthValue(opportunity.startMonth) : ""}
              />

              <FormField
                id={`${formId}-durationMonths`}
                label={LABELS.durationMonths}
                errors={state.errors.durationMonths}
              >
                <Input
                  id={`${formId}-durationMonths`}
                  name="durationMonths"
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  defaultValue={opportunity?.durationMonths?.toString() ?? ""}
                  className="text-right tabular-nums"
                  aria-invalid={!!state.errors.durationMonths?.length}
                  aria-describedby={`${formId}-durationMonths-error`}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-notes-title`}>{OPPORTUNITY_SECTION_TITLES.notes}</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                id={`${formId}-notes`}
                errors={state.errors.notes}
                help="Une ligne de marqueurs, séparés par |"
              >
                <Input
                  id={`${formId}-notes`}
                  name="notes"
                  aria-labelledby={`${formId}-notes-title`}
                  maxLength={200}
                  defaultValue={opportunity?.notes ?? ""}
                  aria-invalid={!!state.errors.notes?.length}
                  aria-describedby={`${formId}-notes-error ${formId}-notes-help`}
                />
              </FormField>
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
