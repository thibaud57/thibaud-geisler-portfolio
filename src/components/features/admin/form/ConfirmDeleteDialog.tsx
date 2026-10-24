"use client"

import { useState, useTransition, type MouseEvent, type ReactNode } from "react"
import { Trash2, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { RowActionButton } from "@/components/features/admin/table/RowActionButton"
import { deleteOutcomeOf, type DeleteOutcome, type DeleteResult } from "@/lib/admin/delete-outcome"
import { assertNever } from "@/lib/assert-never"
import { GENERIC_ERROR_TOAST } from "@/lib/admin/toasts"

interface Props<M extends string> {
  trigger?: ReactNode
  // Nom de l'élément, pour « Supprimer « X » ? » : le titre nomme l'élément, jamais son type.
  name: string
  description?: ReactNode
  // Refus connu au rendu (compteur de rattachements) ; le retour serveur reste la seule protection
  // si un rattachement survient entre l'affichage et la confirmation.
  denied?: string | null
  successMessage: string
  // Un résultat d'action brut est traduit par `denials` ; un DeleteOutcome déjà calculé passe tel quel.
  onDelete: () => Promise<DeleteResult<M> | DeleteOutcome>
  denials?: Partial<Record<M, string>>
}

export function ConfirmDeleteDialog<M extends string>({
  name,
  trigger = (
    <RowActionButton aria-label={`Supprimer ${name}`}>
      <Trash2 className="size-4" />
    </RowActionButton>
  ),
  description = "La suppression est définitive.",
  denied = null,
  successMessage,
  onDelete,
  denials,
}: Props<M>) {
  const [open, setOpen] = useState(false)
  const [serverDenied, setServerDenied] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const deniedMessage = denied ?? serverDenied

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) setServerDenied(null)
  }

  // AlertDialogAction ferme la modale par défaut (DialogPrimitive.Close sous-jacent) : preventDefault
  // systématique pour garder la main sur la fermeture selon le résultat de la suppression.
  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await onDelete()
      const outcome = "status" in result ? result : deleteOutcomeOf(result, denials)
      switch (outcome.status) {
        case "deleted":
          toast.success(successMessage)
          setOpen(false)
          return
        case "denied":
          // Refus métier que le serveur vient d'opposer (élément encore rattaché).
          setServerDenied(outcome.reason)
          return
        case "failed":
          toast.error(GENERIC_ERROR_TOAST)
          setOpen(false)
          return
        default:
          assertNever(outcome)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="size-8 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Supprimer « {name} » ?</AlertDialogTitle>
          {/* aria-live : le refus détecté par le serveur arrive après l'ouverture, dans ce même texte. */}
          <AlertDialogDescription
            aria-live="polite"
            className={deniedMessage ? "text-destructive" : undefined}
          >
            {deniedMessage ?? description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={pending || deniedMessage !== null}
            onClick={handleConfirm}
          >
            {pending ? "Suppression..." : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
