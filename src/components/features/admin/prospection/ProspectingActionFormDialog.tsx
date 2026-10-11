"use client"

import { useActionState, useEffect, useEffectEvent, useId, useState } from "react"
import { Pencil, Plus, Save } from "lucide-react"
import { toast } from "sonner"

import { ComboboxPopover } from "@/components/features/admin/ComboboxPopover"
import { DateTimeField } from "@/components/features/admin/DateTimeField"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { Button } from "@/components/ui/button"
import { CommandGroup, CommandItem } from "@/components/ui/command"
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
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { EnumSelectItems } from "@/components/features/admin/EnumSelectItems"

import { useFormActionSubmit } from "@/hooks/use-form-action-submit"
import { timeOf, toInstant } from "@/lib/date-time"
import { personDisplayName } from "@/lib/persons"
import { isRepliedStatus } from "@/lib/prospecting-action-status"
import {
  ACTION_CHANNEL_ICONS,
  ACTION_CHANNEL_LABELS,
  ACTION_STATUS_ICONS,
  ACTION_STATUS_LABELS,
  PROSPECTING_ACTION_FIELD_LABELS as LABELS,
} from "@/lib/prospecting-actions"
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
  // Mode contrôlé : le parent pilote l'ouverture, aucun déclencheur n'est rendu.
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Nouvelle action seulement.
  defaultDate?: Date
}

export function ProspectingActionFormDialog({
  action,
  personOptions,
  defaultPersonId,
  cardTrigger = false,
  open: controlledOpen,
  onOpenChange,
  defaultDate,
}: Props) {
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
    // Nouvelle clé à chaque ouverture : le formulaire repart d'un état neuf (heure courante comprise).
    if (next) setInstanceKey((key) => key + 1)
  }

  function handleDone() {
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {controlled ? null : action ? (
        <DialogTrigger asChild>
          <RowActionButton aria-label={`Modifier ${action.title}`}>
            <Pencil className="size-4" />
          </RowActionButton>
        </DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button
            type="button"
            variant={cardTrigger ? "outline" : "default"}
            size={cardTrigger ? "sm" : "default"}
          >
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle action
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-160">
        <ProspectingActionForm
          key={instanceKey}
          action={action}
          personOptions={personOptions}
          defaultPersonId={defaultPersonId}
          defaultDate={defaultDate}
          onDone={handleDone}
        />
      </DialogContent>
    </Dialog>
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
  const [personOpen, setPersonOpen] = useState(false)
  const [status, setStatus] = useState<string>(action?.status ?? "A_FAIRE")
  const [date, setDate] = useState<Date | undefined>(action?.occurredAt ?? defaultDate ?? now)
  const [time, setTime] = useState(timeOf(action?.occurredAt ?? now))
  const [respondedDate, setRespondedDate] = useState<Date | undefined>(
    action?.respondedAt ?? undefined,
  )
  const [respondedTime, setRespondedTime] = useState(
    action?.respondedAt ? timeOf(action.respondedAt) : "",
  )

  // La personne d'une action existante peut être sortie des choix (opposition) : son nom reste affiché.
  const selectedLabel =
    personOptions.find((person) => person.id === personId)?.name ??
    (action?.person.id === personId ? personDisplayName(action.person) : null)

  // Effect Event : le formulaire reste monté pendant l'animation de fermeture, un `onDone` d'identité changeante relancerait l'effet de succès et doublerait le toast.
  const handleSaved = useEffectEvent(() => {
    onDone()
    toast.success(action ? "Action mise à jour" : "Action créée")
  })

  useEffect(() => {
    if (state.ok === true) {
      handleSaved()
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state])

  return (
    <form onSubmit={handleSubmit} noValidate className="flex min-h-0 flex-col gap-4">
      <DialogHeader className="shrink-0">
        <DialogTitle>{action ? `Modifier ${action.title}` : "Nouvelle action"}</DialogTitle>
        <DialogDescription>
          {action
            ? "Modifier les informations de cette action."
            : "Créer une action pour suivre un échange avec une personne."}
        </DialogDescription>
      </DialogHeader>

      <DialogBody className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <FormField id={`${formId}-title`} label={LABELS.title} errors={state.errors.title}>
            <Input
              id={`${formId}-title`}
              name="title"
              defaultValue={action?.title ?? ""}
              placeholder="Relance proposition"
              aria-invalid={!!state.errors.title?.length}
              aria-describedby={`${formId}-title-error`}
            />
          </FormField>
        </div>

        <FormField id={`${formId}-personId`} label={LABELS.personId} errors={state.errors.personId}>
          <ComboboxPopover
            id={`${formId}-personId`}
            open={personOpen}
            onOpenChange={setPersonOpen}
            // modal : le verrou de défilement du Dialog parent bloquerait la molette sur cette liste.
            modal
            triggerContent={
              selectedLabel ? (
                <span className="truncate">{selectedLabel}</span>
              ) : (
                <span className="text-muted-foreground">Choisir une personne</span>
              )
            }
            ariaInvalid={!!state.errors.personId?.length}
            ariaDescribedby={`${formId}-personId-error`}
            searchPlaceholder="Chercher une personne"
            emptyMessage="Aucune personne ne correspond."
          >
            <CommandGroup>
              {personOptions.map((person) => (
                <CommandItem
                  key={person.id}
                  value={person.id}
                  keywords={[person.name, person.company?.name ?? ""]}
                  data-checked={personId === person.id}
                  onSelect={() => {
                    setPersonId(person.id)
                    setPersonOpen(false)
                  }}
                >
                  <span className="truncate">{person.name}</span>
                  {person.company ? (
                    <span className="truncate text-muted-foreground">{person.company.name}</span>
                  ) : null}
                </CommandItem>
              ))}
            </CommandGroup>
          </ComboboxPopover>
          <input type="hidden" name="personId" value={personId} />
        </FormField>

        <FormField id={`${formId}-channel`} label={LABELS.channel} errors={state.errors.channel}>
          <Select name="channel" defaultValue={action?.channel ?? "DM_LINKEDIN"}>
            <SelectTrigger
              id={`${formId}-channel`}
              className="w-full"
              aria-invalid={!!state.errors.channel?.length}
              aria-describedby={`${formId}-channel-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <EnumSelectItems
                values={ACTION_CHANNELS}
                labels={ACTION_CHANNEL_LABELS}
                icons={ACTION_CHANNEL_ICONS}
              />
            </SelectContent>
          </Select>
        </FormField>

        <DateTimeField
          id={`${formId}-occurredAt`}
          label={LABELS.occurredAt}
          errors={state.errors.occurredAt}
          date={date}
          onDateChange={setDate}
          time={time}
          onTimeChange={setTime}
          required
        />
        <input type="hidden" name="occurredAt" value={toInstant(date, time)} />

        <FormField id={`${formId}-status`} label={LABELS.status} errors={state.errors.status}>
          <Select name="status" value={status} onValueChange={setStatus}>
            <SelectTrigger
              id={`${formId}-status`}
              className="w-full"
              aria-invalid={!!state.errors.status?.length}
              aria-describedby={`${formId}-status-error`}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <EnumSelectItems
                values={ACTION_STATUSES}
                labels={ACTION_STATUS_LABELS}
                icons={ACTION_STATUS_ICONS}
              />
            </SelectContent>
          </Select>
        </FormField>

        {isRepliedStatus(status) ? (
          <div className="sm:col-span-2">
            <DateTimeField
              id={`${formId}-respondedAt`}
              label={LABELS.respondedAt}
              errors={state.errors.respondedAt}
              date={respondedDate}
              onDateChange={setRespondedDate}
              time={respondedTime}
              onTimeChange={setRespondedTime}
            />
          </div>
        ) : null}
        {/* Vide : le serveur pose l'heure courante au passage à Répondu ou Converti. */}
        <input
          type="hidden"
          name="respondedAt"
          value={isRepliedStatus(status) ? toInstant(respondedDate, respondedTime) : ""}
        />

        <div className="sm:col-span-2">
          <FormField
            id={`${formId}-message`}
            label={LABELS.message}
            errors={state.errors.message}
            help="Le texte exact envoyé, ou le brouillon."
          >
            <Textarea
              id={`${formId}-message`}
              name="message"
              // field-sizing-content ignore `rows` : la hauteur de cinq lignes au repos passe par min-h.
              className="min-h-30"
              defaultValue={action?.message ?? ""}
              aria-invalid={!!state.errors.message?.length}
              aria-describedby={`${formId}-message-help ${formId}-message-error`}
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
