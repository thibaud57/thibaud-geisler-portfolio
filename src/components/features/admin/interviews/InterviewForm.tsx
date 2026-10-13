"use client"

import { useActionState, useId, useMemo, useState } from "react"
import { Trash2, UserPlus } from "lucide-react"
import { useRouter } from "next/navigation"

import { DateTimeField } from "@/components/features/admin/interviews/DateTimeField"
import { DetailsCard } from "@/components/features/admin/form/DetailsCard"
import { EnumSelectItems } from "@/components/features/admin/form/EnumSelectItems"
import { FormCard } from "@/components/features/admin/form/FormCard"
import { FormPage } from "@/components/features/admin/form/FormPage"
import { MultiSelectCombobox } from "@/components/features/admin/form/MultiSelectCombobox"
import { NotesCard } from "@/components/features/admin/form/NotesCard"
import { NumberField } from "@/components/features/admin/form/NumberField"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { SingleSelectCombobox } from "@/components/features/admin/form/SingleSelectCombobox"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type {
  ContactType,
  InterviewSide,
  InterviewStatus,
  InterviewType,
  JobRole,
} from "@/generated/prisma/client"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useHydrated } from "@/components/features/admin/interviews/use-hydrated"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { withCurrentOption } from "@/lib/admin/options"
import {
  ADMIN_INTERVIEWS_PATH,
  ADMIN_LEADS_PATH,
  ADMIN_OPPORTUNITIES_PATH,
} from "@/lib/admin/routes"
import { CONTACT_TYPE_ICONS, CONTACT_TYPE_LABELS } from "@/lib/crm/contacts"
import { timeOf } from "@/lib/date-time"
import { detailsAfterTemplateChange, interviewDetailsTemplate } from "@/lib/crm/details-templates"
import {
  INTERVIEW_DECISION_ICONS,
  INTERVIEW_DECISION_LABELS,
  INTERVIEW_FIELD_LABELS as LABELS,
  INTERVIEW_FORMAT_ICONS,
  INTERVIEW_FORMAT_LABELS,
  INTERVIEW_OUTCOME_ICONS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_SECTION_TITLES,
  INTERVIEW_SIDE_LABELS,
  INTERVIEW_STATUS_ICONS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_ICONS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/crm/interviews"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/crm/job-roles"
import { OPPORTUNITY_SECTION_TITLES } from "@/lib/crm/opportunities"
import { personDisplayName } from "@/lib/crm/persons"
import {
  INTERVIEW_DECISIONS,
  INTERVIEW_FORMATS,
  INTERVIEW_OUTCOMES,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPES,
} from "@/lib/schemas/interview"
import { CONTACT_TYPES } from "@/lib/schemas/network-contact"
import { NONE_LABEL_FEMININE, NONE_VALUE } from "@/lib/schemas/none-value"
import { createInterview, updateInterview } from "@/server/actions/interviews"
import { initialInterviewFormState } from "@/server/actions/interviews.types"
import type { CompanyOption } from "@/server/queries/companies"
import type { AdminInterview } from "@/server/queries/interviews"
import type { OpportunityOption } from "@/server/queries/opportunities"
import type { PersonOption } from "@/server/queries/persons"

const DEFAULT_TIME = "10:00"

function initialTime(interview: AdminInterview | null, storedAt: Date | undefined): string {
  if (storedAt) return timeOf(storedAt)
  return interview ? "" : DEFAULT_TIME
}

interface NewCorrespondentDraft {
  key: string
  name: string
  jobRole: JobRole | ""
  companyId: string
  contactType: ContactType | ""
  email: string
  linkedinUrl: string
}

function toOpportunityOption({ id, title, intermediary, client }: OpportunityOption) {
  return {
    value: id,
    label: title,
    keywords: [title, intermediary?.name ?? "", client?.name ?? ""],
    secondary: intermediary?.name ?? client?.name,
  }
}

function emptyCorrespondentDraft(): NewCorrespondentDraft {
  return {
    key: crypto.randomUUID(),
    name: "",
    jobRole: "",
    companyId: "",
    contactType: "",
    email: "",
    linkedinUrl: "",
  }
}

// Une clé absente vaut une chaîne vide côté schéma : on n'envoie que les champs saisis.
function toNewCorrespondentPayload(draft: NewCorrespondentDraft) {
  return {
    name: draft.name.trim() || undefined,
    jobRole: draft.jobRole || undefined,
    companyId: draft.companyId || undefined,
    contactType: draft.contactType || undefined,
    email: draft.email.trim() || undefined,
    linkedinUrl: draft.linkedinUrl.trim() || undefined,
  }
}

interface NewCorrespondentRowProps {
  draft: NewCorrespondentDraft
  companyOptions: readonly CompanyOption[]
  onChange: (draft: NewCorrespondentDraft) => void
  onRemove: () => void
}

function NewCorrespondentRow({
  draft,
  companyOptions,
  onChange,
  onRemove,
}: NewCorrespondentRowProps) {
  return (
    <div className="grid grid-cols-1 gap-2 rounded-md border p-3 sm:grid-cols-2">
      <Input
        aria-label="Nom du nouveau contact"
        placeholder="Nom"
        value={draft.name}
        onChange={(event) => {
          onChange({ ...draft, name: event.target.value })
        }}
      />
      <Select
        value={draft.jobRole}
        onValueChange={(value) => {
          onChange({ ...draft, jobRole: value as JobRole })
        }}
      >
        <SelectTrigger className="w-full" aria-label="Poste du nouveau contact">
          <SelectValue placeholder="Poste" />
        </SelectTrigger>
        <SelectContent>
          <EnumSelectItems values={JOB_ROLES} labels={JOB_ROLE_LABELS} />
        </SelectContent>
      </Select>
      <Select
        value={draft.companyId}
        onValueChange={(value) => {
          onChange({ ...draft, companyId: value === NONE_VALUE ? "" : value })
        }}
      >
        <SelectTrigger className="w-full" aria-label="Entreprise du nouveau contact">
          <SelectValue placeholder="Entreprise" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Aucune</SelectItem>
          {companyOptions.map((company) => (
            <SelectItem key={company.id} value={company.id}>
              {company.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={draft.contactType}
        onValueChange={(value) => {
          onChange({ ...draft, contactType: value as ContactType })
        }}
      >
        <SelectTrigger className="w-full" aria-label="Type du nouveau contact">
          <SelectValue placeholder="Type de contact" />
        </SelectTrigger>
        <SelectContent>
          <EnumSelectItems
            values={CONTACT_TYPES}
            labels={CONTACT_TYPE_LABELS}
            icons={CONTACT_TYPE_ICONS}
          />
        </SelectContent>
      </Select>
      <Input
        type="email"
        aria-label="Email du nouveau contact"
        placeholder="Email"
        value={draft.email}
        onChange={(event) => {
          onChange({ ...draft, email: event.target.value })
        }}
      />
      <Input
        type="url"
        aria-label="LinkedIn du nouveau contact"
        placeholder="LinkedIn"
        value={draft.linkedinUrl}
        onChange={(event) => {
          onChange({ ...draft, linkedinUrl: event.target.value })
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onRemove}
        className="justify-self-start sm:col-span-2"
      >
        <Trash2 aria-hidden data-icon="inline-start" />
        Retirer
      </Button>
    </div>
  )
}

function originPath(opportunityId: string | undefined, leadId: string | undefined) {
  if (opportunityId) return `${ADMIN_OPPORTUNITIES_PATH}/${opportunityId}` as const
  if (leadId) return `${ADMIN_LEADS_PATH}/${leadId}` as const
  return ADMIN_INTERVIEWS_PATH
}

interface Props {
  interview: AdminInterview | null
  title?: string
  defaultOpportunityId?: string
  // Ouvert depuis la page d'un lead : il devient le premier correspondant et la page de retour.
  defaultLeadId?: string
  opportunityOptions: readonly OpportunityOption[]
  personOptions: readonly PersonOption[]
  companyOptions: readonly CompanyOption[]
}

export function InterviewForm({
  interview,
  title,
  defaultOpportunityId,
  defaultLeadId,
  opportunityOptions,
  personOptions,
  companyOptions,
}: Props) {
  const router = useRouter()
  const formId = useId()
  const action = interview ? updateInterview.bind(null, interview.id) : createInterview
  const [state, formAction, pending] = useActionState(action, initialInterviewFormState)
  const handleSubmit = useFormActionSubmit(formAction)
  const cancelPath = originPath(defaultOpportunityId, defaultLeadId)

  // L'opportunité d'un entretien existant peut être close, donc sortie des choix : elle reste affichée.
  const opportunities = withCurrentOption(opportunityOptions, interview?.opportunity)

  const [opportunityId, setOpportunityId] = useState(
    interview?.opportunityId ?? defaultOpportunityId ?? "",
  )
  const returnPath =
    defaultOpportunityId && opportunityId
      ? (`${ADMIN_OPPORTUNITIES_PATH}/${opportunityId}` as const)
      : cancelPath
  const selectedOpportunity =
    opportunities.find((opportunity) => opportunity.id === opportunityId) ?? null
  const hasIntermediary = selectedOpportunity?.intermediary != null
  const [side, setSide] = useState<InterviewSide>(
    interview?.side ?? (hasIntermediary ? "ESN" : "CLIENT_FINAL"),
  )
  const [correspondentIds, setCorrespondentIds] = useState<string[]>(
    interview?.correspondents.map((person) => person.id) ?? (defaultLeadId ? [defaultLeadId] : []),
  )
  const [newCorrespondents, setNewCorrespondents] = useState<NewCorrespondentDraft[]>([])
  const [type, setType] = useState<InterviewType>(interview?.type ?? "PREMIER_CONTACT")
  const [status, setStatus] = useState<InterviewStatus>(interview?.status ?? "PLANIFIE")
  const [outcome, setOutcome] = useState<string>(interview?.outcome ?? NONE_VALUE)
  const hydrated = useHydrated()
  const [editedDate, setEditedDate] = useState<Date | null>(null)
  const [editedTime, setEditedTime] = useState<string | null>(null)
  const storedAt = hydrated ? interview?.scheduledAt : undefined
  const date = editedDate ?? storedAt
  const time = editedTime ?? initialTime(interview, storedAt)
  const [details, setDetails] = useState(
    interview ? (interview.details ?? "") : interviewDetailsTemplate("PREMIER_CONTACT"),
  )
  const [editorKey, setEditorKey] = useState(0)

  // Les correspondants déjà reliés restent proposés, même opposés depuis.
  const correspondentOptions = useMemo(() => {
    const optionIds = new Set(personOptions.map((person) => person.id))
    return [
      ...personOptions.map((person) => ({
        value: person.id,
        label: person.name,
        ...(person.company ? { hint: person.company.name } : {}),
      })),
      ...(interview?.correspondents ?? [])
        .filter((person) => !optionIds.has(person.id))
        .map((person) => ({ value: person.id, label: personDisplayName(person) })),
    ]
  }, [interview, personOptions])
  const correspondentErrors = [
    ...new Set([
      ...(state.errors.correspondentIds ?? []),
      ...(state.errors.newCorrespondents ?? []),
    ]),
  ]

  useSaveFeedback(state, {
    saved: interview ? "Entretien mis à jour" : "Entretien créé",
    onSaved: () => {
      router.push(returnPath)
    },
    gone: { code: "interview_not_found", toast: "Cet entretien a été supprimé" },
  })

  function handleOpportunityChange(nextId: string) {
    setOpportunityId(nextId)
    const nextHasIntermediary =
      opportunities.find((opportunity) => opportunity.id === nextId)?.intermediary != null
    // Une opportunité en client direct ne peut pas être menée côté ESN ; un nouvel entretien part du côté qui mène par défaut.
    if (!interview) setSide(nextHasIntermediary ? "ESN" : "CLIENT_FINAL")
    else if (side === "ESN" && !nextHasIntermediary) setSide("CLIENT_FINAL")
  }

  function handleTypeChange(value: string) {
    const nextType = value as InterviewType
    if (!interview) {
      const nextDetails = detailsAfterTemplateChange(
        details,
        interviewDetailsTemplate(type),
        interviewDetailsTemplate(nextType),
      )
      if (nextDetails !== details) {
        setDetails(nextDetails)
        setEditorKey((key) => key + 1)
      }
    }
    setType(nextType)
  }

  function handleStatusChange(value: string) {
    const nextStatus = value as InterviewStatus
    if (nextStatus !== "FAIT") setOutcome(NONE_VALUE)
    setStatus(nextStatus)
  }

  return (
    <FormPage
      title={title ?? "Nouvel entretien"}
      cancelHref={cancelPath}
      pending={pending}
      onSubmit={handleSubmit}
      main={
        <>
          <FormCard title={OPPORTUNITY_SECTION_TITLES.opportunity} columns={2}>
            <SingleSelectCombobox
              id={`${formId}-opportunityId`}
              name="opportunityId"
              label={LABELS.opportunityId}
              options={opportunities.map(toOpportunityOption)}
              value={opportunityId}
              onChange={handleOpportunityChange}
              errors={state.errors.opportunityId}
              placeholder="Choisir une opportunité"
              searchPlaceholder="Chercher une opportunité"
              emptyMessage="Aucune opportunité ne correspond."
            />

            <FormField id={`${formId}-side`} label={LABELS.side} errors={state.errors.side}>
              <RadioGroup
                id={`${formId}-side`}
                value={side}
                onValueChange={(value) => {
                  setSide(value as InterviewSide)
                }}
                // Hauteur d'un champ (h-8) : à côté d'une liste déroulante, les radios s'alignent sur son centre.
                className="flex min-h-8 flex-wrap items-center gap-4"
                aria-invalid={!!state.errors.side?.length}
                aria-describedby={`${formId}-side-error`}
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem
                    id={`${formId}-side-esn`}
                    value="ESN"
                    disabled={!hasIntermediary}
                  />
                  <Label htmlFor={`${formId}-side-esn`}>{INTERVIEW_SIDE_LABELS.ESN}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem id={`${formId}-side-client`} value="CLIENT_FINAL" />
                  <Label htmlFor={`${formId}-side-client`}>
                    {INTERVIEW_SIDE_LABELS.CLIENT_FINAL}
                  </Label>
                </div>
              </RadioGroup>
              <input type="hidden" name="side" value={side} />
            </FormField>
          </FormCard>

          <FormCard title={INTERVIEW_SECTION_TITLES.exchange} columns={2}>
            <SelectField
              id={`${formId}-type`}
              name="type"
              label={LABELS.type}
              options={INTERVIEW_TYPES}
              labels={INTERVIEW_TYPE_LABELS}
              icons={INTERVIEW_TYPE_ICONS}
              value={type}
              onValueChange={handleTypeChange}
              errors={state.errors.type}
            />

            <SelectField
              id={`${formId}-format`}
              name="format"
              label={LABELS.format}
              options={INTERVIEW_FORMATS}
              labels={INTERVIEW_FORMAT_LABELS}
              icons={INTERVIEW_FORMAT_ICONS}
              defaultValue={interview?.format ?? NONE_VALUE}
              errors={state.errors.format}
            />

            <DateTimeField
              id={`${formId}-scheduledAt`}
              name="scheduledAt"
              label={LABELS.scheduledAt}
              errors={state.errors.scheduledAt}
              date={date}
              onDateChange={(next) => {
                setEditedDate(next ?? null)
              }}
              time={time}
              onTimeChange={setEditedTime}
              required
            />

            <SelectField
              id={`${formId}-status`}
              name="status"
              label={LABELS.status}
              options={INTERVIEW_STATUSES}
              labels={INTERVIEW_STATUS_LABELS}
              icons={INTERVIEW_STATUS_ICONS}
              value={status}
              onValueChange={handleStatusChange}
              errors={state.errors.status}
            />

            <div className="flex min-w-0 flex-col gap-3 sm:col-span-2">
              <FormField
                id={`${formId}-correspondentIds`}
                label={LABELS.correspondentIds}
                error={correspondentErrors.map((message) => (
                  <p key={message} className="text-sm text-destructive">
                    {message}
                  </p>
                ))}
                help={
                  newCorrespondents.length > 0
                    ? "Chaque nouvelle personne devient un contact du type choisi. Le reste de sa fiche se complète depuis Contacts."
                    : undefined
                }
              >
                <MultiSelectCombobox
                  id={`${formId}-correspondentIds`}
                  name="correspondentIds"
                  options={correspondentOptions}
                  selected={correspondentIds}
                  onChange={setCorrespondentIds}
                  placeholder="Ajouter un correspondant"
                  searchPlaceholder="Chercher un lead ou un contact"
                  emptyMessage="Aucun lead ni contact ne correspond."
                  ariaInvalid={correspondentErrors.length > 0}
                  ariaDescribedby={`${formId}-correspondentIds-error${newCorrespondents.length > 0 ? ` ${formId}-correspondentIds-help` : ""}`}
                />
                {newCorrespondents.map((draft) => (
                  <NewCorrespondentRow
                    key={draft.key}
                    draft={draft}
                    companyOptions={companyOptions}
                    onChange={(next) => {
                      setNewCorrespondents((drafts) =>
                        drafts.map((current) => (current.key === next.key ? next : current)),
                      )
                    }}
                    onRemove={() => {
                      setNewCorrespondents((drafts) =>
                        drafts.filter((current) => current.key !== draft.key),
                      )
                    }}
                  />
                ))}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="self-start"
                  onClick={() => {
                    setNewCorrespondents((drafts) => [...drafts, emptyCorrespondentDraft()])
                  }}
                >
                  <UserPlus aria-hidden data-icon="inline-start" />
                  Nouveau contact
                </Button>
                <input
                  type="hidden"
                  name="newCorrespondents"
                  value={JSON.stringify(newCorrespondents.map(toNewCorrespondentPayload))}
                />
              </FormField>
            </div>
          </FormCard>

          <DetailsCard
            formId={formId}
            title={LABELS.details}
            value={details}
            onChange={setDetails}
            errors={state.errors.details}
            editorKey={editorKey}
          />
        </>
      }
      aside={
        <>
          <FormCard title={INTERVIEW_SECTION_TITLES.evaluation} columns={2}>
            {status === "FAIT" ? (
              <div className="sm:col-span-2">
                <SelectField
                  id={`${formId}-outcome`}
                  name="outcome"
                  label={LABELS.outcome}
                  options={INTERVIEW_OUTCOMES}
                  labels={INTERVIEW_OUTCOME_LABELS}
                  icons={INTERVIEW_OUTCOME_ICONS}
                  value={outcome}
                  onValueChange={setOutcome}
                  errors={state.errors.outcome}
                  noneLabel={NONE_LABEL_FEMININE}
                />
              </div>
            ) : null}

            <NumberField
              id={`${formId}-score`}
              name="score"
              label={LABELS.score}
              min={0}
              max={10}
              step={1}
              defaultValue={interview?.score?.toString() ?? ""}
              errors={state.errors.score}
            />

            <SelectField
              id={`${formId}-decision`}
              name="decision"
              label={LABELS.decision}
              options={INTERVIEW_DECISIONS}
              labels={INTERVIEW_DECISION_LABELS}
              icons={INTERVIEW_DECISION_ICONS}
              defaultValue={interview?.decision ?? NONE_VALUE}
              errors={state.errors.decision}
              noneLabel={NONE_LABEL_FEMININE}
            />
          </FormCard>

          <NotesCard
            formId={formId}
            title={LABELS.notes}
            errors={state.errors.notes}
            defaultValue={interview?.notes}
          />
        </>
      }
    />
  )
}
