"use client"

import { useActionState, useEffect, useId, useState } from "react"
import { Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { CompanyCombobox } from "@/components/features/admin/CompanyCombobox"
import { OptionalDateField } from "@/components/features/admin/OptionalDateField"
import { OptOutPersonDialog } from "@/components/features/admin/persons/OptOutPersonDialog"
import { SelectField } from "@/components/features/admin/SelectField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Editor } from "@/components/ui/editor"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"

import type { LeadOrigin } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { ADMIN_LEADS_PATH } from "@/lib/admin-routes"
import { DETAILS_EDITOR_HELP, detailsAfterOriginChange } from "@/lib/details-templates"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import {
  LEAD_CHANNEL_ICONS,
  LEAD_CHANNEL_LABELS,
  LEAD_FIELD_LABELS,
  LEAD_INTEREST_ICONS,
  LEAD_INTEREST_LABELS,
  LEAD_ORIGIN_ICONS,
  LEAD_ORIGIN_LABELS,
  LEAD_SECTION_TITLES,
  LEAD_STATUS_ICONS,
  LEAD_STATUS_LABELS,
} from "@/lib/leads"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/persons"
import { LEAD_CHANNELS, LEAD_INTERESTS, LEAD_ORIGINS, LEAD_STATUSES } from "@/lib/schemas/lead"
import { NONE_VALUE } from "@/lib/schemas/person"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
import { createLead, updateLead } from "@/server/actions/leads"
import { initialLeadFormState } from "@/server/actions/leads.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminLead } from "@/server/queries/leads"

interface Props {
  lead: AdminLead | null
  companyOptions: readonly CompanyOption[]
  relatedCards?: React.ReactNode
}

export function LeadForm({ lead, companyOptions, relatedCards }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = lead ? updateLead.bind(null, lead.id) : createLead
  const [state, formAction, pending] = useActionState(action, initialLeadFormState)
  const handleSubmit = useFormActionSubmit(formAction)

  const [origin, setOrigin] = useState<LeadOrigin | "">(lead?.origin ?? "")
  const [details, setDetails] = useState(lead?.details ?? "")
  const [companyId, setCompanyId] = useState(lead?.company?.id ?? NONE_VALUE)
  const [metAt, setMetAt] = useState<Date | undefined>(lead?.metAt ?? undefined)

  // Un booléen plutôt que `lead` en dépendance : chaque revalidation livre un nouvel objet lead, qui rejouerait le toast du dernier état.
  const isEdit = lead !== null

  useEffect(() => {
    if (state.ok === true) {
      toast.success(isEdit ? "Lead mis à jour" : "Lead créé")
      router.push(ADMIN_LEADS_PATH)
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    } else if (state.ok === false && state.message === "lead_opted_out_locked") {
      toast.error("Cette personne s'est opposée à la prospection : sa fiche ne se modifie plus")
    } else if (state.ok === false && state.message === "lead_not_found") {
      toast.error("Ce lead a été supprimé")
      router.push(ADMIN_LEADS_PATH)
    }
  }, [state, isEdit, router])

  function handleOriginChange(next: string) {
    const nextOrigin = next as LeadOrigin
    if (!lead) {
      const nextDetails = detailsAfterOriginChange(details, origin, nextOrigin)
      if (nextDetails !== details) setDetails(nextDetails)
    }
    setOrigin(nextOrigin)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {lead ? personDisplayName(lead) : "Nouveau lead"}
        </h1>
        <div className="flex flex-wrap gap-2">
          {lead ? (
            <OptOutPersonDialog
              person={lead}
              hasContactRole={lead.contactRole !== null}
              onDone={() => {
                // La fiche vidée ne vit plus que dans Tous.
                router.push(ADMIN_LEADS_PATH)
              }}
            />
          ) : null}
          <Button type="button" variant="ghost" asChild>
            <Link href={ADMIN_LEADS_PATH}>Annuler</Link>
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
              <CardTitle>{PERSON_SECTION_TITLES.person}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={`${formId}-name`}
                label={PERSON_FIELD_LABELS.name}
                errors={state.errors.name}
              >
                <Input
                  id={`${formId}-name`}
                  name="name"
                  defaultValue={lead?.name ?? ""}
                  placeholder="Jeanne Dupont"
                  aria-invalid={!!state.errors.name?.length}
                  aria-describedby={`${formId}-name-error`}
                />
              </FormField>

              <SelectField
                id={`${formId}-jobRole`}
                name="jobRole"
                label={PERSON_FIELD_LABELS.jobRole}
                options={JOB_ROLES}
                labels={JOB_ROLE_LABELS}
                defaultValue={lead?.jobRole ?? NONE_VALUE}
                errors={state.errors.jobRole}
                noneLabel="Non renseigné"
              />

              <CompanyCombobox
                id={`${formId}-companyId`}
                options={companyOptions}
                value={companyId}
                onChange={setCompanyId}
                errors={state.errors.companyId}
              />

              <SelectField
                id={`${formId}-zone`}
                name="zone"
                label={PERSON_FIELD_LABELS.zone}
                options={ZONES}
                labels={ZONE_LABELS}
                defaultValue={lead?.zone ?? NONE_VALUE}
                errors={state.errors.zone}
                noneLabel="Non renseignée"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{PERSON_SECTION_TITLES.contact}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                id={`${formId}-email`}
                label={PERSON_FIELD_LABELS.email}
                errors={state.errors.email}
              >
                <Input
                  id={`${formId}-email`}
                  name="email"
                  type="email"
                  defaultValue={lead?.email ?? ""}
                  placeholder="jeanne@acme.example"
                  aria-invalid={!!state.errors.email?.length}
                  aria-describedby={`${formId}-email-error`}
                />
              </FormField>

              <FormField
                id={`${formId}-phone`}
                label={PERSON_FIELD_LABELS.phone}
                errors={state.errors.phone}
              >
                <Input
                  id={`${formId}-phone`}
                  name="phone"
                  type="tel"
                  defaultValue={lead?.phone ?? ""}
                  placeholder="+33 6 …"
                  aria-invalid={!!state.errors.phone?.length}
                  aria-describedby={`${formId}-phone-error`}
                />
              </FormField>

              <div className="sm:col-span-2">
                <FormField
                  id={`${formId}-linkedinUrl`}
                  label={PERSON_FIELD_LABELS.linkedinUrl}
                  errors={state.errors.linkedinUrl}
                >
                  <Input
                    id={`${formId}-linkedinUrl`}
                    name="linkedinUrl"
                    type="url"
                    defaultValue={lead?.linkedinUrl ?? ""}
                    placeholder="linkedin.com/in/…"
                    aria-invalid={!!state.errors.linkedinUrl?.length}
                    aria-describedby={`${formId}-linkedinUrl-error`}
                  />
                </FormField>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-details-title`}>{PERSON_SECTION_TITLES.details}</CardTitle>
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
              <CardTitle>{LEAD_SECTION_TITLES.pipeline}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id={`${formId}-status`}
                name="status"
                label={LEAD_FIELD_LABELS.status}
                options={LEAD_STATUSES}
                labels={LEAD_STATUS_LABELS}
                icons={LEAD_STATUS_ICONS}
                defaultValue={lead?.status ?? "NOUVEAU"}
                errors={state.errors.status}
              />

              <SelectField
                id={`${formId}-interest`}
                name="interest"
                label={LEAD_FIELD_LABELS.interest}
                options={LEAD_INTERESTS}
                labels={LEAD_INTEREST_LABELS}
                icons={LEAD_INTEREST_ICONS}
                defaultValue={lead?.interest ?? NONE_VALUE}
                errors={state.errors.interest}
                noneLabel="Non renseigné"
              />

              <SelectField
                id={`${formId}-origin`}
                name="origin"
                label={LEAD_FIELD_LABELS.origin}
                options={LEAD_ORIGINS}
                labels={LEAD_ORIGIN_LABELS}
                icons={LEAD_ORIGIN_ICONS}
                value={origin}
                onValueChange={handleOriginChange}
                placeholder="Choisir une origine"
                errors={state.errors.origin}
              />

              <SelectField
                id={`${formId}-channel`}
                name="channel"
                label={LEAD_FIELD_LABELS.channel}
                options={LEAD_CHANNELS}
                labels={LEAD_CHANNEL_LABELS}
                icons={LEAD_CHANNEL_ICONS}
                defaultValue={lead?.channel ?? NONE_VALUE}
                errors={state.errors.channel}
                noneLabel="Non renseigné"
              />

              <OptionalDateField
                id={`${formId}-metAt`}
                name="metAt"
                label={PERSON_FIELD_LABELS.metAt}
                value={metAt}
                onChange={setMetAt}
                errors={state.errors.metAt}
              />

              <FormField
                id={`${formId}-score`}
                label={LEAD_FIELD_LABELS.score}
                errors={state.errors.score}
              >
                <Input
                  id={`${formId}-score`}
                  name="score"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  step={1}
                  className="text-right tabular-nums"
                  defaultValue={lead?.score?.toString() ?? ""}
                  aria-invalid={!!state.errors.score?.length}
                  aria-describedby={`${formId}-score-error`}
                />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-notes-title`}>{PERSON_SECTION_TITLES.notes}</CardTitle>
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
                  defaultValue={lead?.notes ?? ""}
                  placeholder="Décideur technique | TypeScript/React"
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
