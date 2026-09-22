"use client"

import { useState, useTransition, type MouseEvent, type ReactNode } from "react"
import { TriangleAlert } from "lucide-react"
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

// `denied` porte le refus métier que le serveur vient d'opposer (élément encore rattaché) ; null
// quand l'échec est technique, auquel cas la modale se ferme sur un toast générique.
export type DeleteOutcome = { ok: true } | { ok: false; denied: string | null }

interface Props {
  trigger: ReactNode
  // Nom de l'élément, pour « Supprimer « X » ? » : le titre nomme l'élément, jamais son type.
  name: string
  description?: ReactNode
  // Refus connu au rendu (compteur de rattachements) ; le retour serveur reste la seule protection
  // si un rattachement survient entre l'affichage et la confirmation.
  denied?: string | null
  successMessage: string
  onDelete: () => Promise<DeleteOutcome>
}

export function ConfirmDeleteDialog({
  trigger,
  name,
  description = "La suppression est définitive.",
  denied = null,
  successMessage,
  onDelete,
}: Props) {
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
      if (result.ok) {
        toast.success(successMessage)
        setOpen(false)
      } else if (result.denied === null) {
        toast.error("Une erreur est survenue, réessayez")
        setOpen(false)
      } else {
        setServerDenied(result.denied)
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
