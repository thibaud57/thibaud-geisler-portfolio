"use client"

import { useActionState, useId, useState } from "react"
import { useRouter } from "next/navigation"

import { DetailsCard } from "@/components/features/admin/form/DetailsCard"
import { FormCard } from "@/components/features/admin/form/FormCard"
import { FormPage } from "@/components/features/admin/form/FormPage"
import { NotesCard } from "@/components/features/admin/form/NotesCard"
import { NumberField } from "@/components/features/admin/form/NumberField"
import { OptionalDateField } from "@/components/features/admin/form/OptionalDateField"
import { OptOutPersonDialog } from "@/components/features/admin/persons/OptOutPersonDialog"
import { PersonFields } from "@/components/features/admin/persons/PersonFields"
import { SelectField } from "@/components/features/admin/form/SelectField"
import type { LeadOrigin } from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import { contactDetailHrefOf } from "@/lib/crm/person-links"
import { detailsAfterOriginChange } from "@/lib/crm/details-templates"
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
} from "@/lib/crm/leads"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/crm/persons"
import { LEAD_CHANNELS, LEAD_INTERESTS, LEAD_ORIGINS, LEAD_STATUSES } from "@/lib/schemas/lead"
import { NONE_LABEL } from "@/lib/schemas/none-value"
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
  const [editorKey, setEditorKey] = useState(0)
  const [metAt, setMetAt] = useState<Date | undefined>(lead?.metAt ?? undefined)

  useSaveFeedback(state, {
    saved: lead ? "Lead mis à jour" : "Lead créé",
    onSaved: () => {
      router.push(ADMIN_LEADS_PATH)
    },
    messages: {
      lead_opted_out_locked:
        "Cette personne s'est opposée à la prospection : sa fiche ne se modifie plus",
    },
    gone: { code: "lead_not_found", toast: "Ce lead a été supprimé" },
  })

  function handleOriginChange(next: string) {
    const nextOrigin = next as LeadOrigin
    if (!lead) {
      const nextDetails = detailsAfterOriginChange(details, origin, nextOrigin)
      if (nextDetails !== details) {
        setDetails(nextDetails)
        setEditorKey((key) => key + 1)
      }
    }
    setOrigin(nextOrigin)
  }

  return (
    <FormPage
      title={lead ? personDisplayName(lead) : "Nouveau lead"}
      cancelHref={ADMIN_LEADS_PATH}
      pending={pending}
      onSubmit={handleSubmit}
      actions={
        lead ? (
          <OptOutPersonDialog
            person={lead}
            hasContactRole={lead.hasContactRole}
            onDone={() => {
              // La fiche vidée ne vit plus que dans Tous.
              router.push(ADMIN_LEADS_PATH)
            }}
          />
        ) : null
      }
      main={
        <>
          <PersonFields
            formId={formId}
            companyOptions={companyOptions}
            defaults={lead}
            errors={state.errors}
            otherRole={
              lead
                ? { label: LEAD_FIELD_LABELS.contactRole, href: contactDetailHrefOf(lead) }
                : undefined
            }
          />

          <DetailsCard
            formId={formId}
            title={PERSON_SECTION_TITLES.details}
            value={details}
            onChange={setDetails}
            errors={state.errors.details}
            editorKey={editorKey}
          />

          {relatedCards}
        </>
      }
      aside={
        <>
          <FormCard title={LEAD_SECTION_TITLES.pipeline} columns={2}>
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
              defaultValue={lead?.interest}
              errors={state.errors.interest}
              noneLabel={NONE_LABEL}
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
              defaultValue={lead?.channel}
              errors={state.errors.channel}
              noneLabel={NONE_LABEL}
            />

            <OptionalDateField
              id={`${formId}-metAt`}
              name="metAt"
              label={PERSON_FIELD_LABELS.metAt}
              value={metAt}
              onChange={setMetAt}
              errors={state.errors.metAt}
            />

            <NumberField
              id={`${formId}-score`}
              name="score"
              label={LEAD_FIELD_LABELS.score}
              min={0}
              max={10}
              step={1}
              defaultValue={lead?.score?.toString() ?? ""}
              errors={state.errors.score}
            />
          </FormCard>

          <NotesCard
            formId={formId}
            title={PERSON_SECTION_TITLES.notes}
            errors={state.errors.notes}
            defaultValue={lead?.notes}
            placeholder="Décideur technique | TypeScript/React"
          />
        </>
      }
    />
  )
}
