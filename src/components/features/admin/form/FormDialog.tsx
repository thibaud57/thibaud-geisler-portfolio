"use client"

import { Fragment, useState, type ReactNode, type SubmitEvent } from "react"
import { Save, type LucideIcon } from "lucide-react"

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

interface DialogProps {
  trigger?: ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
  // Rendu à chaque ouverture sous une nouvelle clé : le formulaire repart d'un état neuf (heure courante, valeurs par défaut).
  children: (onDone: () => void) => ReactNode
}

export function FormDialog({ trigger, open: controlledOpen, onOpenChange, children }: DialogProps) {
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
      {controlled || !trigger ? null : <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-160">
        <Fragment key={instanceKey}>
          {children(() => {
            setOpen(false)
          })}
        </Fragment>
      </DialogContent>
    </Dialog>
  )
}

interface SubmitOptions {
  label?: string
  pendingLabel?: string
  icon?: LucideIcon
  disabled?: boolean
}

interface FormProps {
  title: string
  description: string
  pending: boolean
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
  submit?: SubmitOptions
  children: ReactNode
}

export function FormDialogForm({
  title,
  description,
  pending,
  onSubmit,
  submit,
  children,
}: FormProps) {
  return (
    <form onSubmit={onSubmit} noValidate className="flex min-h-0 flex-col gap-4">
      <DialogHeader className="shrink-0">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <DialogBody className="grid gap-4 sm:grid-cols-2">{children}</DialogBody>
      <FormDialogFooter pending={pending} submit={submit} />
    </form>
  )
}

export function FormDialogFooter({
  pending,
  submit,
}: {
  pending: boolean
  submit?: SubmitOptions
}) {
  const {
    label = "Enregistrer",
    pendingLabel = "Enregistrement...",
    icon: Icon = Save,
    disabled = false,
  } = submit ?? {}

  return (
    <DialogFooter className="shrink-0">
      <DialogClose asChild>
        <Button type="button" variant="outline">
          Annuler
        </Button>
      </DialogClose>
      <Button type="submit" disabled={pending || disabled}>
        <Icon aria-hidden data-icon="inline-start" />
        {pending ? pendingLabel : label}
      </Button>
    </DialogFooter>
  )
}
