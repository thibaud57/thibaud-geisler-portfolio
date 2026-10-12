"use client"

import { useActionState, useEffect, useId, useState } from "react"
import { useRouter } from "next/navigation"

import { CheckboxGroupField } from "@/components/features/admin/form/CheckboxGroupField"
import { DetailsCard } from "@/components/features/admin/form/DetailsCard"
import { FormCard } from "@/components/features/admin/form/FormCard"
import { FormPage } from "@/components/features/admin/form/FormPage"
import { MirroredField } from "@/components/features/admin/form/MirroredField"
import { NotesCard } from "@/components/features/admin/form/NotesCard"
import { OptionalDateField } from "@/components/features/admin/form/OptionalDateField"
import { PersonCombobox } from "@/components/features/admin/form/PersonCombobox"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { PersonFields } from "@/components/features/admin/persons/PersonFields"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin/routes"
import {
  CONTACT_FIELD_LABELS,
  CONTACT_SECTION_TITLES,
  CONTACT_STATUS_ICONS,
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_ICONS,
  CONTACT_TYPE_LABELS,
} from "@/lib/crm/contacts"
import { CONTACT_DETAILS_TEMPLATE } from "@/lib/crm/details-templates"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/crm/persons"
import { formatDateOnly } from "@/lib/date-time"
import { CONTACT_STATUSES, CONTACT_TYPES } from "@/lib/schemas/network-contact"
import { NONE_VALUE } from "@/lib/schemas/none-value"
import { createContact, findLeadForContactAttach, updateContact } from "@/server/actions/contacts"
import { initialContactFormState } from "@/server/actions/contacts.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { ContactRecord } from "@/server/queries/contacts"
import type { AttachableLead, PersonOption } from "@/server/queries/persons"

type Mode = "new" | "fromLead"

interface Props {
  contact: ContactRecord | null
  companyOptions: readonly CompanyOption[]
  leadOptions?: readonly PersonOption[]
}

export function ContactForm({ contact, companyOptions, leadOptions = [] }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = contact ? updateContact.bind(null, contact.id) : createContact
  const [state, formAction, pending] = useActionState(action, initialContactFormState)

  const [mode, setMode] = useState<Mode>("new")
  const [selectedLeadId, setSelectedLeadId] = useState(NONE_VALUE)
  const [leadError, setLeadError] = useState<string[] | undefined>(undefined)
  const [loadedLead, setLoadedLead] = useState<AttachableLead | null>(null)
  const fromLead = selectedLeadId !== NONE_VALUE
  const lead = loadedLead?.id === selectedLeadId ? loadedLead : null
  const leadLoading = fromLead && lead === null
  // Sans lead choisi, le formulaire partirait en création d'une personne vide : la garde le retient côté client.
  const handleSubmit = useFormActionSubmit(formAction, () => {
    if (mode === "fromLead" && !fromLead) {
      setLeadError(["Choisissez un lead"])
      return false
    }
    return !leadLoading
  })

  const [details, setDetails] = useState(
    contact ? (contact.details ?? "") : CONTACT_DETAILS_TEMPLATE,
  )

  const [metAt, setMetAt] = useState<Date | undefined>(contact?.metAt ?? undefined)

  useSaveFeedback(state, {
    saved: contact ? "Contact mis à jour" : "Contact créé",
    onSaved: () => {
      router.push(ADMIN_CONTACTS_PATH)
    },
    messages: {
      contact_opted_out_locked:
        "Cette personne s'est opposée à la prospection : sa fiche ne se modifie plus",
    },
    gone: { code: "contact_not_found", toast: "Ce contact a été supprimé" },
  })

  useEffect(() => {
    if (selectedLeadId === NONE_VALUE) return
    let ignore = false
    function fail(message: string) {
      setLeadError([message])
      setSelectedLeadId(NONE_VALUE)
    }
    findLeadForContactAttach(selectedLeadId)
      .then((result) => {
        if (ignore) return
        if (result === null) fail("Ce lead n'existe plus, recharge la page")
        else setLoadedLead(result)
      })
      .catch(() => {
        if (!ignore) fail("Chargement du lead impossible, réessayez")
      })
    return () => {
      ignore = true
    }
  }, [selectedLeadId])

  function handleModeChange(next: string) {
    const nextMode = next as Mode
    if (nextMode === "new") setSelectedLeadId(NONE_VALUE)
    setLeadError(undefined)
    setMode(nextMode)
  }

  function handleLeadSelect(leadId: string) {
    setSelectedLeadId(leadId)
    setLeadError(undefined)
  }

  return (
    <FormPage
      title={contact ? personDisplayName(contact) : "Nouveau contact"}
      cancelHref={ADMIN_CONTACTS_PATH}
      pending={pending}
      onSubmit={handleSubmit}
      main={
        <>
          <PersonFields
            formId={formId}
            companyOptions={companyOptions}
            defaults={contact}
            errors={state.errors}
            mirror={fromLead ? { lead, loading: leadLoading } : undefined}
            identityHeader={
              contact ? null : (
                <>
                  <RadioGroup
                    aria-label="Source du contact"
                    value={mode}
                    onValueChange={handleModeChange}
                    className="flex flex-wrap gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id={`${formId}-mode-new`} value="new" />
                      <Label htmlFor={`${formId}-mode-new`}>Nouveau contact</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem id={`${formId}-mode-fromLead`} value="fromLead" />
                      <Label htmlFor={`${formId}-mode-fromLead`}>Depuis un lead</Label>
                    </div>
                  </RadioGroup>
                  {mode === "fromLead" ? (
                    <PersonCombobox
                      id={`${formId}-leadId`}
                      label="Lead"
                      options={leadOptions}
                      value={selectedLeadId}
                      onChange={handleLeadSelect}
                      errors={leadError ?? state.errors.personId}
                      placeholder="Choisir un lead"
                      searchPlaceholder="Chercher un lead"
                      emptyMessage="Aucun lead ne correspond."
                    />
                  ) : null}
                </>
              )
            }
          />
          {fromLead ? <input type="hidden" name="personId" value={selectedLeadId} /> : null}

          <DetailsCard
            formId={formId}
            title={PERSON_SECTION_TITLES.details}
            value={details}
            onChange={setDetails}
            errors={state.errors.details}
            mirror={fromLead ? { value: lead?.details ?? "", loading: leadLoading } : undefined}
          />
        </>
      }
      aside={
        <>
          <FormCard title={CONTACT_SECTION_TITLES.relation}>
            <SelectField
              id={`${formId}-status`}
              name="status"
              label={CONTACT_FIELD_LABELS.status}
              options={CONTACT_STATUSES}
              labels={CONTACT_STATUS_LABELS}
              icons={CONTACT_STATUS_ICONS}
              defaultValue={contact?.status ?? "ACTIF"}
              errors={state.errors.status}
            />

            <CheckboxGroupField
              id={`${formId}-types`}
              name="types"
              label={CONTACT_FIELD_LABELS.types}
              options={CONTACT_TYPES}
              labels={CONTACT_TYPE_LABELS}
              icons={CONTACT_TYPE_ICONS}
              defaultValue={contact?.types ?? []}
              errors={state.errors.types}
            />

            <MirroredField
              mirrored={fromLead}
              mirror={{
                id: `${formId}-lead-metAt`,
                label: PERSON_FIELD_LABELS.metAt,
                value: lead?.metAt ? formatDateOnly(lead.metAt) : "",
                loading: leadLoading,
              }}
            >
              <OptionalDateField
                id={`${formId}-metAt`}
                name="metAt"
                label={PERSON_FIELD_LABELS.metAt}
                value={metAt}
                onChange={setMetAt}
                errors={state.errors.metAt}
              />
            </MirroredField>
          </FormCard>

          <NotesCard
            formId={formId}
            title={PERSON_SECTION_TITLES.notes}
            errors={state.errors.notes}
            defaultValue={contact?.notes}
            placeholder="Ancien collègue | TypeScript"
            mirror={fromLead ? { value: lead?.notes ?? "", loading: leadLoading } : undefined}
          />
        </>
      }
    />
  )
}
