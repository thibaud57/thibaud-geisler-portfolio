"use client"

import { useState, useTransition, type MouseEvent } from "react"
import { Eraser, TriangleAlert } from "lucide-react"
import { toast } from "sonner"

import { RowActionButton } from "@/components/features/admin/RowActionButton"
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

import { personDisplayName, type PersonRef } from "@/lib/persons"
import { erasePersonExchanges } from "@/server/actions/persons"

interface Props {
  person: PersonRef
}

export function ErasePersonExchangesDialog({ person }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const name = personDisplayName(person)

  // AlertDialogAction referme la modale d'office : preventDefault pour ne la fermer qu'une fois le résultat connu.
  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await erasePersonExchanges(person.id)
      setOpen(false)
      if (result.ok) {
        toast.success("Échanges effacés")
      } else {
        toast.error("Une erreur est survenue, réessayez")
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <RowActionButton aria-label={`Effacer les échanges de ${name}`}>
          <Eraser className="size-4" />
        </RowActionButton>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="size-8 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Effacer les échanges de « {name} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Les actions et les signaux de cette personne sont supprimés définitivement, ainsi que sa
            présence dans ses entretiens. Action irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? "Effacement..." : "Effacer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
