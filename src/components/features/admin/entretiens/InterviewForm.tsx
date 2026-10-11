"use client"

import { useActionState, useEffect, useEffectEvent, useId, useMemo, useState } from "react"
import { Save, Trash2, UserPlus } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { DateTimeField } from "@/components/features/admin/DateTimeField"
import { EnumSelectItems } from "@/components/features/admin/EnumSelectItems"
import { MultiSelectCombobox } from "@/components/features/admin/MultiSelectCombobox"
import { SelectField } from "@/components/features/admin/SelectField"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CommandGroup, CommandItem } from "@/components/ui/command"
import { Editor } from "@/components/ui/editor"
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
import { useHydrated } from "@/hooks/use-hydrated"
import { ADMIN_INTERVIEWS_PATH, ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin-routes"
import { CONTACT_TYPE_ICONS, CONTACT_TYPE_LABELS } from "@/lib/contacts"
import { timeOf, toInstant } from "@/lib/date-time"
import {
  DETAILS_EDITOR_HELP,
  detailsAfterTemplateChange,
  interviewDetailsTemplate,
} from "@/lib/details-templates"
import {
  INTERVIEW_DECISION_ICONS,
  INTERVIEW_DECISION_LABELS,
  INTERVIEW_FIELD_LABELS as LABELS,
  INTERVIEW_OUTCOME_ICONS,
  INTERVIEW_OUTCOME_LABELS,
  INTERVIEW_SIDE_LABELS,
  INTERVIEW_STATUS_ICONS,
  INTERVIEW_STATUS_LABELS,
  INTERVIEW_TYPE_ICONS,
  INTERVIEW_TYPE_LABELS,
} from "@/lib/interviews"
import { JOB_ROLE_LABELS, JOB_ROLES } from "@/lib/job-roles"
import { personDisplayName } from "@/lib/persons"
import {
  INTERVIEW_DECISIONS,
  INTERVIEW_OUTCOMES,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPES,
} from "@/lib/schemas/interview"
import { CONTACT_TYPES } from "@/lib/schemas/network-contact"
import { NONE_VALUE } from "@/lib/schemas/person"
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

interface Props {
  interview: AdminInterview | null
  title?: string
  defaultOpportunityId?: string
  opportunityOptions: readonly OpportunityOption[]
  personOptions: readonly PersonOption[]
  companyOptions: readonly CompanyOption[]
}

export function InterviewForm({
  interview,
  title,
  defaultOpportunityId,
  opportunityOptions,
  personOptions,
  companyOptions,
}: Props) {
  const router = useRouter()
  const formId = useId()
  const action = interview ? updateInterview.bind(null, interview.id) : createInterview
  const [state, formAction, pending] = useActionState(action, initialInterviewFormState)
  const handleSubmit = useFormActionSubmit(formAction)
  const cancelPath = defaultOpportunityId
    ? (`${ADMIN_OPPORTUNITIES_PATH}/${defaultOpportunityId}` as const)
    : ADMIN_INTERVIEWS_PATH

  // L'opportunité d'un entretien existant peut être close, donc sortie des choix : elle reste affichée.
  const opportunities = useMemo<readonly OpportunityOption[]>(() => {
    if (!interview || opportunityOptions.some((option) => option.id === interview.opportunityId)) {
      return opportunityOptions
    }
    return [
      {
        id: interview.opportunity.id,
        title: interview.opportunity.title,
        intermediary: interview.opportunity.intermediary
          ? { name: interview.opportunity.intermediary.name }
          : null,
        client: interview.opportunity.client ? { name: interview.opportunity.client.name } : null,
      },
      ...opportunityOptions,
    ]
  }, [interview, opportunityOptions])

  const [opportunityId, setOpportunityId] = useState(
    interview?.opportunityId ?? defaultOpportunityId ?? "",
  )
  const [opportunityOpen, setOpportunityOpen] = useState(false)
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
    interview?.correspondents.map((person) => person.id) ?? [],
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
  // Rien ne garantit que l'éditeur relise `value` après son montage : une nouvelle clé le remonte sur le gabarit.
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

  // Événement d'effet : ni `interview` (nouvel objet à chaque revalidation) ni `returnPath` (suit l'opportunité choisie) ne doivent rejouer le toast du dernier état.
  const onStateChange = useEffectEvent((next: typeof state) => {
    if (next.ok === true) {
      toast.success(interview ? "Entretien mis à jour" : "Entretien créé")
      router.push(returnPath)
    } else if (next.ok === false && next.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  })

  useEffect(() => {
    onStateChange(state)
  }, [state])

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
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {title ?? "Nouvel entretien"}
        </h1>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href={cancelPath}>Annuler</Link>
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
              <CardTitle>Opportunité</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                id={`${formId}-opportunityId`}
                label={LABELS.opportunityId}
                errors={state.errors.opportunityId}
              >
                <ComboboxPopover
                  id={`${formId}-opportunityId`}
                  open={opportunityOpen}
                  onOpenChange={setOpportunityOpen}
                  triggerContent={
                    selectedOpportunity ? (
                      <span className="truncate">{selectedOpportunity.title}</span>
                    ) : (
                      <span className="text-muted-foreground">Choisir une opportunité</span>
                    )
                  }
                  ariaInvalid={!!state.errors.opportunityId?.length}
                  ariaDescribedby={`${formId}-opportunityId-error`}
                  searchPlaceholder="Chercher une opportunité"
                  emptyMessage="Aucune opportunité ne correspond."
                >
                  <CommandGroup>
                    {opportunities.map((opportunity) => (
                      <CommandItem
                        key={opportunity.id}
                        value={opportunity.id}
                        keywords={[
                          opportunity.title,
                          opportunity.intermediary?.name ?? "",
                          opportunity.client?.name ?? "",
                        ]}
                        data-checked={opportunityId === opportunity.id}
                        onSelect={() => {
                          handleOpportunityChange(opportunity.id)
                          setOpportunityOpen(false)
                        }}
                      >
                        <span className="truncate">{opportunity.title}</span>
                        <span className="truncate text-muted-foreground">
                          {opportunity.intermediary?.name ?? opportunity.client?.name ?? ""}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </ComboboxPopover>
                <input type="hidden" name="opportunityId" value={opportunityId} />
              </FormField>

              <FormField id={`${formId}-side`} label={LABELS.side} errors={state.errors.side}>
                <RadioGroup
                  id={`${formId}-side`}
                  value={side}
                  onValueChange={(value) => {
                    setSide(value as InterviewSide)
                  }}
                  className="flex flex-wrap gap-4"
                  aria-invalid={!!state.errors.side?.length}
                  aria-describedby={`${formId}-side-error`}
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem
                      id={`${formId}-side-esn`}
                      value="ESN"
                      disabled={!hasIntermediary}
                    />
                    <Label htmlFor={`${formId}-side-esn`}>
                      {INTERVIEW_SIDE_LABELS.ESN}
                      {selectedOpportunity?.intermediary
                        ? ` · ${selectedOpportunity.intermediary.name}`
                        : " (aucune)"}
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem id={`${formId}-side-client`} value="CLIENT_FINAL" />
                    <Label htmlFor={`${formId}-side-client`}>
                      {INTERVIEW_SIDE_LABELS.CLIENT_FINAL}
                      {selectedOpportunity?.client ? ` · ${selectedOpportunity.client.name}` : ""}
                    </Label>
                  </div>
                </RadioGroup>
                <input type="hidden" name="side" value={side} />
              </FormField>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Échange</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
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

              <div>
                <DateTimeField
                  id={`${formId}-scheduledAt`}
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
                <input type="hidden" name="scheduledAt" value={toInstant(date, time)} />
              </div>

              <div className={status === "FAIT" ? undefined : "sm:col-span-2"}>
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
              </div>

              {status === "FAIT" ? (
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
                  noneLabel="Non renseignée"
                />
              ) : null}

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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-details-title`}>{LABELS.details}</CardTitle>
              <CardDescription>{DETAILS_EDITOR_HELP}</CardDescription>
            </CardHeader>
            <CardContent>
              <FormField id={`${formId}-details`} errors={state.errors.details}>
                <Editor
                  key={editorKey}
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
        </div>

        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">
          <Card>
            <CardHeader>
              <CardTitle>Évaluation</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField id={`${formId}-score`} label={LABELS.score} errors={state.errors.score}>
                <Input
                  id={`${formId}-score`}
                  name="score"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={10}
                  step={1}
                  className="text-right tabular-nums"
                  defaultValue={interview?.score?.toString() ?? ""}
                  aria-invalid={!!state.errors.score?.length}
                  aria-describedby={`${formId}-score-error`}
                />
              </FormField>

              <SelectField
                id={`${formId}-decision`}
                name="decision"
                label={LABELS.decision}
                options={INTERVIEW_DECISIONS}
                labels={INTERVIEW_DECISION_LABELS}
                icons={INTERVIEW_DECISION_ICONS}
                defaultValue={interview?.decision ?? NONE_VALUE}
                errors={state.errors.decision}
                noneLabel="Non renseignée"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle id={`${formId}-notes-title`}>{LABELS.notes}</CardTitle>
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
                  defaultValue={interview?.notes ?? ""}
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
