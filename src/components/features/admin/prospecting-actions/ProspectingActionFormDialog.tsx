"use client"

import { useActionState, useId, useState } from "react"
import { Plus } from "lucide-react"

import { DateTimeField } from "@/components/features/admin/form/DateTimeField"
import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormDialog, FormDialogForm } from "@/components/features/admin/form/FormDialog"
import { PersonCombobox } from "@/components/features/admin/form/PersonCombobox"
import { EditRowButton } from "@/components/features/admin/table/EditRowButton"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { TextareaField } from "@/components/features/admin/form/TextareaField"
import { Button } from "@/components/ui/button"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { timeOf } from "@/lib/date-time"
import { personDisplayName } from "@/lib/crm/persons"
import { isRepliedStatus } from "@/lib/crm/prospecting-action-status"
import {
  ACTION_CHANNEL_ICONS,
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
} from "@/lib/crm/prospecting-actions"
import { ACTION_CHANNELS, ACTION_STATUSES } from "@/lib/schemas/prospecting-action"
import {
  createProspectingAction,
  updateProspectingAction,
} from "@/server/actions/prospecting-actions"
import { initialProspectingActionFormState } from "@/server/actions/prospecting-actions.types"
import type { PersonOption } from "@/server/queries/persons"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface Props {
  action: AdminProspectingAction | null
  personOptions: readonly PersonOption[]
  defaultPersonId?: string
  cardTrigger?: boolean
  open?: boolean
  onOpenChange?: (open: boolean) => void
  defaultDate?: Date
}

export function ProspectingActionFormDialog({
  action,
  personOptions,
  defaultPersonId,
  cardTrigger = false,
  open,
  onOpenChange,
  defaultDate,
}: Props) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        open === undefined ? (
          action ? (
            <EditRowButton label={`Modifier ${action.title}`} />
          ) : (
            <Button
              type="button"
              variant={cardTrigger ? "outline" : "default"}
              size={cardTrigger ? "sm" : "default"}
            >
              <Plus aria-hidden data-icon="inline-start" />
              Nouvelle action
            </Button>
          )
        ) : undefined
      }
    >
      {(onDone) => (
        <ProspectingActionForm
          action={action}
          personOptions={personOptions}
          defaultPersonId={defaultPersonId}
          defaultDate={defaultDate}
          onDone={onDone}
        />
      )}
    </FormDialog>
  )
}

function ProspectingActionForm({
  action,
  personOptions,
  defaultPersonId,
  defaultDate,
  onDone,
}: {
  action: AdminProspectingAction | null
  personOptions: readonly PersonOption[]
  defaultPersonId: string | undefined
  defaultDate: Date | undefined
  onDone: () => void
}) {
  const formId = useId()
  const formAction = action
    ? updateProspectingAction.bind(null, action.id)
    : createProspectingAction
  const [state, submitAction, pending] = useActionState(
    formAction,
    initialProspectingActionFormState,
  )
  const handleSubmit = useFormActionSubmit(submitAction)

  const [now] = useState(() => new Date())
  const [personId, setPersonId] = useState(action?.person.id ?? defaultPersonId ?? "")
  const [status, setStatus] = useState<string>(action?.status ?? "A_FAIRE")
  const [date, setDate] = useState<Date | undefined>(action?.occurredAt ?? defaultDate ?? now)
  const [time, setTime] = useState(timeOf(action?.occurredAt ?? now))
  const [respondedDate, setRespondedDate] = useState<Date | undefined>(
    action?.respondedAt ?? undefined,
  )
  const [respondedTime, setRespondedTime] = useState(
    action?.respondedAt ? timeOf(action.respondedAt) : "",
  )

  useSaveFeedback(state, {
    saved: action ? "Action mise à jour" : "Action créée",
    onSaved: onDone,
    gone: { code: "prospecting_action_not_found", toast: "Cette action a été supprimée" },
  })

  const replied = isRepliedStatus(status)

  return (
    <FormDialogForm
      title={action ? `Modifier ${action.title}` : "Nouvelle action"}
      description={
        action
          ? "Modifier les informations de cette action."
          : "Créer une action pour suivre un échange avec une personne."
      }
      pending={pending}
      onSubmit={handleSubmit}
    >
      <FieldInput
        id={`${formId}-title`}
        name="title"
        label={LABELS.title}
        defaultValue={action?.title ?? ""}
        placeholder="Relance proposition"
        errors={state.errors.title}
      />

      <PersonCombobox
        id={`${formId}-personId`}
        name="personId"
        label={LABELS.personId}
        options={personOptions}
        value={personId}
        onChange={setPersonId}
        errors={state.errors.personId}
        modal
        selectedFallback={
          action ? { id: action.person.id, name: personDisplayName(action.person) } : null
        }
      />

      <SelectField
        id={`${formId}-channel`}
        name="channel"
        label={LABELS.channel}
        options={ACTION_CHANNELS}
        labels={ACTION_CHANNEL_LABELS}
        icons={ACTION_CHANNEL_ICONS}
        defaultValue={action?.channel ?? "DM_LINKEDIN"}
        errors={state.errors.channel}
      />

      <SelectField
        id={`${formId}-status`}
        name="status"
        label={LABELS.status}
        options={ACTION_STATUSES}
        labels={ACTION_STATUS_LABELS}
        icons={ACTION_STATUS_ICONS}
        value={status}
        onValueChange={setStatus}
        errors={state.errors.status}
      />

      {/* Aucun champ seul sur une demi-ligne : sans la réponse reçue, la date et l'heure prennent la ligne. */}
      <div className={replied ? undefined : "sm:col-span-2"}>
        <DateTimeField
          id={`${formId}-occurredAt`}
          label={LABELS.occurredAt}
          errors={state.errors.occurredAt}
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          required
          name="occurredAt"
        />
      </div>

      {replied ? (
        <DateTimeField
          id={`${formId}-respondedAt`}
          name="respondedAt"
          label={LABELS.respondedAt}
          errors={state.errors.respondedAt}
          date={respondedDate}
          onDateChange={setRespondedDate}
          time={respondedTime}
          onTimeChange={setRespondedTime}
        />
      ) : null}

      <div className="sm:col-span-2">
        <TextareaField
          id={`${formId}-message`}
          name="message"
          label={LABELS.message}
          help="Le texte exact envoyé, ou le brouillon."
          // field-sizing-content ignore `rows` : la hauteur de cinq lignes au repos passe par min-h.
          className="min-h-30"
          defaultValue={action?.message ?? ""}
          errors={state.errors.message}
        />
      </div>
    </FormDialogForm>
  )
}
