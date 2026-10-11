"use client"

import { useActionState, useEffect, useEffectEvent, useId, useState } from "react"
import { Plus, Save } from "lucide-react"
import { toast } from "sonner"

import { OptionalDateField } from "@/components/features/admin/OptionalDateField"
import { SelectField } from "@/components/features/admin/SelectField"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { dateOnlyToLocal } from "@/lib/date-time"
import {
  SIGNAL_FIELD_LABELS as LABELS,
  SIGNAL_TYPE_ICONS,
  SIGNAL_TYPE_LABELS,
  signalLabel,
  signalTypesFor,
  type SignalItem,
  type SignalOwner,
} from "@/lib/signals"
import { createCompanySignal, createPersonSignal, updateSignal } from "@/server/actions/signals"
import { initialSignalFormState } from "@/server/actions/signals.types"

interface Props {
  owner: SignalOwner
  signal: SignalItem | null
  // Mode contrôlé : le parent pilote l'ouverture, aucun déclencheur n'est rendu.
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function SignalFormDialog({ owner, signal, open: controlledOpen, onOpenChange }: Props) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [instanceKey, setInstanceKey] = useState(0)
  const controlled = controlledOpen !== undefined
  const open = controlled ? controlledOpen : internalOpen

  function setOpen(next: boolean) {
    if (!controlled) setInternalOpen(next)
    onOpenChange?.(next)
  }

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setInstanceKey((key) => key + 1)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {controlled ? null : (
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm">
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau signal
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-160">
        <SignalForm
          key={instanceKey}
          owner={owner}
          signal={signal}
          onDone={() => {
            setOpen(false)
          }}
        />
      </DialogContent>
    </Dialog>
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

  // Effect Event : le formulaire reste monté pendant l'animation de fermeture, un `onDone` d'identité changeante relancerait l'effet de succès et doublerait le toast.
  const handleSaved = useEffectEvent(() => {
    onDone()
    toast.success(signal ? "Signal mis à jour" : "Signal créé")
  })

  useEffect(() => {
    if (state.ok === true) {
      handleSaved()
    } else if (state.ok === false && state.message === "lead_not_eligible") {
      toast.error("Ce lead ne peut pas recevoir de signal")
    } else if (state.ok === false && state.message === "signal_not_found") {
      toast.error("Ce signal n'existe plus")
    } else if (state.ok === false && state.message === "company_not_found") {
      toast.error("Cette entreprise n'existe plus")
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state])

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col gap-4">
      <DialogHeader className="shrink-0">
        <DialogTitle>{signal ? `Modifier ${signalLabel(signal)}` : "Nouveau signal"}</DialogTitle>
        <DialogDescription>
          {signal
            ? "Modifier les informations de ce signal."
            : `Ajouter un signal à ${owner.name}.`}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="grid gap-4 sm:grid-cols-2">
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

        <OptionalDateField
          id={`${formId}-occurredOn`}
          name="occurredOn"
          label={LABELS.occurredOn}
          errors={state.errors.occurredOn}
          value={occurredOn}
          onChange={setOccurredOn}
        />

        <div className="sm:col-span-2">
          <FormField
            id={`${formId}-sourceUrl`}
            label={LABELS.sourceUrl}
            errors={state.errors.sourceUrl}
          >
            <Input
              id={`${formId}-sourceUrl`}
              name="sourceUrl"
              type="url"
              maxLength={2048}
              placeholder="https://"
              defaultValue={signal?.sourceUrl ?? ""}
              aria-invalid={!!state.errors.sourceUrl?.length}
              aria-describedby={`${formId}-sourceUrl-error`}
            />
          </FormField>
        </div>

        <div className="sm:col-span-2">
          <FormField id={`${formId}-content`} label={LABELS.content} errors={state.errors.content}>
            <Textarea
              id={`${formId}-content`}
              name="content"
              rows={3}
              maxLength={500}
              defaultValue={signal?.content ?? ""}
              aria-invalid={!!state.errors.content?.length}
              aria-describedby={`${formId}-content-error`}
            />
          </FormField>
        </div>
      </DialogBody>

      <DialogFooter className="shrink-0">
        <DialogClose asChild>
          <Button type="button" variant="outline">
            Annuler
          </Button>
        </DialogClose>
        <Button type="submit" disabled={pending}>
          <Save aria-hidden data-icon="inline-start" />
          {pending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </DialogFooter>
    </form>
  )
}
