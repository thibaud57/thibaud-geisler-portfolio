"use client"

import { useActionState, useId, useState } from "react"
import { Plus } from "lucide-react"

import { DateField } from "@/components/features/admin/form/DateField"
import { FieldInput } from "@/components/features/admin/form/FieldInput"
import { FormDialog, FormDialogForm } from "@/components/features/admin/form/FormDialog"
import { SelectField } from "@/components/features/admin/form/SelectField"
import { TextareaField } from "@/components/features/admin/form/TextareaField"
import { Button } from "@/components/ui/button"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { useSaveFeedback } from "@/hooks/use-save-feedback"
import { dateOnlyToLocal } from "@/lib/date-time"
import {
  SIGNAL_FIELD_LABELS as LABELS,
  SIGNAL_TYPE_ICONS,
  SIGNAL_TYPE_LABELS,
  signalLabel,
  signalTypesFor,
  type SignalItem,
  type SignalOwner,
} from "@/lib/crm/signals"
import { createCompanySignal, createPersonSignal, updateSignal } from "@/server/actions/signals"
import { initialSignalFormState } from "@/server/actions/signals.types"

interface Props {
  owner: SignalOwner
  signal: SignalItem | null
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SignalFormDialog({ owner, signal, open, onOpenChange }: Props) {
  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        open === undefined ? (
          <Button type="button" variant="outline" size="sm">
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau signal
          </Button>
        ) : undefined
      }
    >
      {(onDone) => <SignalForm owner={owner} signal={signal} onDone={onDone} />}
    </FormDialog>
  )
}

function SignalForm({
  owner,
  signal,
  onDone,
}: {
  owner: SignalOwner
  signal: SignalItem | null
  onDone: () => void
}) {
  const formId = useId()
  const action = signal
    ? updateSignal.bind(null, signal.id)
    : owner.kind === "company"
      ? createCompanySignal.bind(null, owner.id)
      : createPersonSignal.bind(null, owner.id)
  const [state, formAction, pending] = useActionState(action, initialSignalFormState)
  const handleSubmit = useFormActionSubmit(formAction)
  const types = signalTypesFor(owner.kind)

  const [occurredOn, setOccurredOn] = useState<Date | undefined>(
    signal ? dateOnlyToLocal(signal.occurredOn) : undefined,
  )

  useSaveFeedback(state, {
    saved: signal ? "Signal mis à jour" : "Signal créé",
    onSaved: onDone,
    messages: {
      lead_not_eligible: "Ce lead ne peut pas recevoir de signal",
      company_not_found: "Cette entreprise n'existe plus",
    },
    gone: { code: "signal_not_found", toast: "Ce signal n'existe plus" },
  })

  return (
    <FormDialogForm
      title={signal ? `Modifier ${signalLabel(signal)}` : "Nouveau signal"}
      description={
        signal ? "Modifier les informations de ce signal." : `Ajouter un signal à ${owner.name}.`
      }
      pending={pending}
      onSubmit={handleSubmit}
    >
      <SelectField
        id={`${formId}-type`}
        name="type"
        label={LABELS.type}
        options={types}
        labels={SIGNAL_TYPE_LABELS}
        icons={SIGNAL_TYPE_ICONS}
        defaultValue={signal?.type ?? types[0]}
        errors={state.errors.type}
      />

      <DateField
        id={`${formId}-occurredOn`}
        name="occurredOn"
        label={LABELS.occurredOn}
        value={occurredOn}
        onChange={setOccurredOn}
        errors={state.errors.occurredOn}
        required
      />

      <div className="sm:col-span-2">
        <FieldInput
          id={`${formId}-sourceUrl`}
          name="sourceUrl"
          label={LABELS.sourceUrl}
          type="url"
          maxLength={2048}
          placeholder="https://"
          defaultValue={signal?.sourceUrl ?? ""}
          errors={state.errors.sourceUrl}
        />
      </div>

      <div className="sm:col-span-2">
        <TextareaField
          id={`${formId}-content`}
          name="content"
          label={LABELS.content}
          rows={3}
          maxLength={500}
          defaultValue={signal?.content ?? ""}
          errors={state.errors.content}
        />
      </div>
    </FormDialogForm>
  )
}
