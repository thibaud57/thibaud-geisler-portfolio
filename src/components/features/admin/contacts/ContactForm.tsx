"use client"

import { useActionState, useEffect, useId, useState } from "react"
import { Save } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { CompanyCombobox } from "@/components/features/admin/CompanyCombobox"
import { ReadOnlyField } from "@/components/features/admin/ReadOnlyField"
import { SelectField } from "@/components/features/admin/SelectField"
import { MarkdownContent } from "@/components/markdown/MarkdownContent"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { Editor } from "@/components/ui/editor"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin-routes"
import {
  CONTACT_FIELD_LABELS,
  CONTACT_SECTION_TITLES,
  CONTACT_STATUS_ICONS,
  CONTACT_STATUS_LABELS,
  CONTACT_TYPE_ICONS,
  CONTACT_TYPE_LABELS,
} from "@/lib/contacts"
import { CONTACT_DETAILS_TEMPLATE, DETAILS_EDITOR_HELP } from "@/lib/details-templates"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import { PERSON_FIELD_LABELS, PERSON_SECTION_TITLES, personDisplayName } from "@/lib/persons"
import { toIsoDate } from "@/lib/projects"
import { CONTACT_STATUSES, CONTACT_TYPES } from "@/lib/schemas/network-contact"
import { NONE_VALUE } from "@/lib/schemas/person"
import { ZONE_LABELS, ZONES } from "@/lib/zones"
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
  const [leadOpen, setLeadOpen] = useState(false)
  const [leadError, setLeadError] = useState<string[] | undefined>(undefined)
  const [loadedLead, setLoadedLead] = useState<AttachableLead | null>(null)
  const selectedOption = leadOptions.find((option) => option.id === selectedLeadId) ?? null
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

  const [companyId, setCompanyId] = useState(contact?.company?.id ?? NONE_VALUE)
  const [details, setDetails] = useState(
    contact ? (contact.details ?? "") : CONTACT_DETAILS_TEMPLATE,
  )

  // Hors maquette pour un contact, mais `personFields` l'exige : renvoyée telle quelle, la mise à jour n'efface pas la date de rencontre d'un lead promu.
  const metAt = contact?.metAt ? toIsoDate(contact.metAt) : ""
  // Un booléen plutôt que `contact` en dépendance : chaque revalidation livre un nouvel objet contact, qui rejouerait le toast du dernier état.
  const isEdit = contact !== null

  useEffect(() => {
    if (state.ok === true) {
      toast.success(isEdit ? "Contact mis à jour" : "Contact créé")
      router.push(ADMIN_CONTACTS_PATH)
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    } else if (state.ok === false && state.message === "contact_opted_out_locked") {
      toast.error("Cette personne s'est opposée à la prospection : sa fiche ne se modifie plus")
    } else if (state.ok === false && state.message === "contact_not_found") {
      toast.error("Ce contact a été supprimé")
      router.push(ADMIN_CONTACTS_PATH)
    }
  }, [state, isEdit, router])

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

  function handleLeadSelect(option: PersonOption) {
    setSelectedLeadId(option.id)
    setLeadError(undefined)
    setLeadOpen(false)
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {contact ? personDisplayName(contact) : "Nouveau contact"}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href={ADMIN_CONTACTS_PATH}>Annuler</Link>
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
            <CardContent className="flex flex-col gap-4">
              {!contact ? (
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
                    <FormField
                      id={`${formId}-leadId`}
                      label="Lead"
                      errors={leadError ?? state.errors.personId}
                    >
                      <ComboboxPopover
                        id={`${formId}-leadId`}
                        open={leadOpen}
                        onOpenChange={setLeadOpen}
                        triggerContent={
                          selectedOption ? (
                            <span className="truncate">{selectedOption.name}</span>
                          ) : (
                            <span className="text-muted-foreground">Choisir un lead</span>
                          )
                        }
                        ariaInvalid={!!(leadError ?? state.errors.personId)?.length}
                        ariaDescribedby={`${formId}-leadId-error`}
                        searchPlaceholder="Chercher un lead"
                        emptyMessage="Aucun lead ne correspond."
                      >
                        <CommandGroup>
                          {leadOptions.map((option) => (
                            <CommandItem
                              key={option.id}
                              value={option.id}
                              keywords={[option.name, option.company?.name ?? ""]}
                              data-checked={selectedLeadId === option.id}
                              onSelect={() => {
                                handleLeadSelect(option)
                              }}
                            >
                              <span className="truncate">{option.name}</span>
                              {option.company ? (
                                <span className="truncate text-muted-foreground">
                                  {option.company.name}
                                </span>
                              ) : null}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </ComboboxPopover>
                    </FormField>
                  ) : null}
                </>
              ) : null}

              <div className="grid gap-4 sm:grid-cols-2">
                <div hidden={fromLead}>
                  <FormField
                    id={`${formId}-name`}
                    label={PERSON_FIELD_LABELS.name}
                    errors={state.errors.name}
                  >
                    <Input
                      id={`${formId}-name`}
                      name="name"
                      defaultValue={contact?.name ?? ""}
                      placeholder="Jeanne Dupont"
                      aria-invalid={!!state.errors.name?.length}
                      aria-describedby={`${formId}-name-error`}
                    />
                  </FormField>
                </div>
                {fromLead ? (
                  <ReadOnlyField
                    id={`${formId}-lead-name`}
                    label={PERSON_FIELD_LABELS.name}
                    value={lead?.name ?? ""}
                    loading={leadLoading}
                  />
                ) : null}

                <div hidden={fromLead}>
                  <SelectField
                    id={`${formId}-jobRole`}
                    name="jobRole"
                    label={PERSON_FIELD_LABELS.jobRole}
                    options={JOB_ROLES}
                    labels={JOB_ROLE_LABELS}
                    defaultValue={contact?.jobRole ?? NONE_VALUE}
                    errors={state.errors.jobRole}
                    noneLabel="Non renseigné"
                  />
                </div>
                {fromLead ? (
                  <ReadOnlyField
                    id={`${formId}-lead-jobRole`}
                    label={PERSON_FIELD_LABELS.jobRole}
                    value={
                      lead ? (lead.jobRole ? JOB_ROLE_LABELS[lead.jobRole] : "Non renseigné") : ""
                    }
                    loading={leadLoading}
                  />
                ) : null}

                <div hidden={fromLead}>
                  <CompanyCombobox
                    id={`${formId}-companyId`}
                    options={companyOptions}
                    value={companyId}
                    onChange={setCompanyId}
                    errors={state.errors.companyId}
                  />
                </div>
                {fromLead ? (
                  <ReadOnlyField
                    id={`${formId}-lead-companyId`}
                    label={PERSON_FIELD_LABELS.companyId}
                    value={lead ? (lead.company?.name ?? "Aucune") : ""}
                    loading={leadLoading}
                  />
                ) : null}

                <div hidden={fromLead}>
                  <SelectField
                    id={`${formId}-zone`}
                    name="zone"
                    label={PERSON_FIELD_LABELS.zone}
                    options={ZONES}
                    labels={ZONE_LABELS}
                    defaultValue={contact?.zone ?? NONE_VALUE}
                    errors={state.errors.zone}
                    noneLabel="Non renseignée"
                  />
                </div>
                {fromLead ? (
                  <ReadOnlyField
                    id={`${formId}-lead-zone`}
                    label={PERSON_FIELD_LABELS.zone}
                    value={lead ? (lead.zone ? ZONE_LABELS[lead.zone] : "Non renseignée") : ""}
                    loading={leadLoading}
                  />
                ) : null}
              </div>
            </CardContent>
          </Card>
          {fromLead ? <input type="hidden" name="personId" value={selectedLeadId} /> : null}
          {contact ? <input type="hidden" name="metAt" value={metAt} /> : null}

          <Card>
            <CardHeader>
              <CardTitle>{PERSON_SECTION_TITLES.contact}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div hidden={fromLead}>
                <FormField
                  id={`${formId}-email`}
                  label={PERSON_FIELD_LABELS.email}
                  errors={state.errors.email}
                >
                  <Input
                    id={`${formId}-email`}
                    name="email"
                    type="email"
                    defaultValue={contact?.email ?? ""}
                    placeholder="prenom@example.com"
                    aria-invalid={!!state.errors.email?.length}
                    aria-describedby={`${formId}-email-error`}
                  />
                </FormField>
              </div>
              {fromLead ? (
                <ReadOnlyField
                  id={`${formId}-lead-email`}
                  label={PERSON_FIELD_LABELS.email}
                  value={lead?.email ?? ""}
                  loading={leadLoading}
                />
              ) : null}

              <div hidden={fromLead}>
                <FormField
                  id={`${formId}-phone`}
                  label={PERSON_FIELD_LABELS.phone}
                  errors={state.errors.phone}
                >
                  <Input
                    id={`${formId}-phone`}
                    name="phone"
                    type="tel"
                    defaultValue={contact?.phone ?? ""}
                    placeholder="+33 6 …"
                    aria-invalid={!!state.errors.phone?.length}
                    aria-describedby={`${formId}-phone-error`}
                  />
                </FormField>
              </div>
              {fromLead ? (
                <ReadOnlyField
                  id={`${formId}-lead-phone`}
                  label={PERSON_FIELD_LABELS.phone}
                  value={lead?.phone ?? ""}
                  loading={leadLoading}
                />
              ) : null}

              <div hidden={fromLead} className="sm:col-span-2">
                <FormField
                  id={`${formId}-linkedinUrl`}
                  label={PERSON_FIELD_LABELS.linkedinUrl}
                  errors={state.errors.linkedinUrl}
                >
                  <Input
                    id={`${formId}-linkedinUrl`}
                    name="linkedinUrl"
                    type="url"
                    defaultValue={contact?.linkedinUrl ?? ""}
                    placeholder="linkedin.com/in/…"
                    aria-invalid={!!state.errors.linkedinUrl?.length}
                    aria-describedby={`${formId}-linkedinUrl-error`}
                  />
                </FormField>
              </div>
              {fromLead ? (
                <div className="sm:col-span-2">
                  <ReadOnlyField
                    id={`${formId}-lead-linkedinUrl`}
                    label={PERSON_FIELD_LABELS.linkedinUrl}
                    value={lead?.linkedinUrl ?? ""}
                    loading={leadLoading}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-details-title`}>{PERSON_SECTION_TITLES.details}</CardTitle>
              {fromLead ? null : <CardDescription>{DETAILS_EDITOR_HELP}</CardDescription>}
            </CardHeader>
            <CardContent>
              <div hidden={fromLead}>
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
              </div>
              {fromLead ? (
                <div
                  role="group"
                  aria-labelledby={`${formId}-details-title`}
                  aria-busy={leadLoading}
                  className="rounded-md border border-input bg-muted p-3"
                >
                  <MarkdownContent markdown={lead?.details ?? ""} variant="admin" />
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">
          <Card>
            <CardHeader>
              <CardTitle>{CONTACT_SECTION_TITLES.relation}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
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

              <FormField
                id={`${formId}-types`}
                label={CONTACT_FIELD_LABELS.types}
                errors={state.errors.types}
              >
                <div
                  id={`${formId}-types`}
                  role="group"
                  aria-label={CONTACT_FIELD_LABELS.types}
                  aria-describedby={`${formId}-types-error`}
                  className="grid grid-cols-2 gap-x-4 gap-y-2"
                >
                  {CONTACT_TYPES.map((type) => {
                    const Icon = CONTACT_TYPE_ICONS[type]
                    return (
                      <label key={type} className="flex min-w-0 items-center gap-2 text-sm">
                        <Checkbox
                          name="types"
                          value={type}
                          defaultChecked={contact?.types.includes(type) ?? false}
                          aria-invalid={!!state.errors.types?.length}
                        />
                        {Icon ? <Icon aria-hidden /> : null}
                        {CONTACT_TYPE_LABELS[type]}
                      </label>
                    )
                  })}
                </div>
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-notes-title`}>{PERSON_SECTION_TITLES.notes}</CardTitle>
            </CardHeader>
            <CardContent>
              <div hidden={fromLead}>
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
                    defaultValue={contact?.notes ?? ""}
                    placeholder="Ancien collègue | Scala"
                    aria-invalid={!!state.errors.notes?.length}
                    aria-describedby={`${formId}-notes-error ${formId}-notes-help`}
                  />
                </FormField>
              </div>
              {fromLead ? (
                <Input
                  readOnly
                  disabled={leadLoading}
                  aria-busy={leadLoading}
                  aria-labelledby={`${formId}-notes-title`}
                  value={lead?.notes ?? ""}
                  className="truncate bg-muted text-muted-foreground dark:bg-muted"
                />
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </form>
  )
}
