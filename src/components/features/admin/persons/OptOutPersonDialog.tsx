"use client"

import { useState, useTransition, type MouseEvent } from "react"
import { TriangleAlert, UserX } from "lucide-react"
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
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"

import {
  OPTED_OUT_LABEL,
  optOutDeletesPerson,
  personDisplayName,
  type PersonRef,
} from "@/lib/persons"
import { erasePersonExchanges, optOutPerson } from "@/server/actions/persons"

interface Props {
  person: PersonRef
  hasContactRole: boolean
  onDone: () => void
}

export function OptOutPersonDialog({ person, hasContactRole, onDone }: Props) {
  const [open, setOpen] = useState(false)
  const [eraseToo, setEraseToo] = useState(false)
  const [pending, startTransition] = useTransition()
  const deletesRecord = optOutDeletesPerson(person)

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) setEraseToo(false)
  }

  // AlertDialogAction referme la modale d'office : preventDefault pour ne la fermer qu'une fois le résultat connu.
  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await optOutPerson(person.id)
      const erasure = result.ok && eraseToo ? await erasePersonExchanges(person.id) : null
      handleOpenChange(false)
      if (!result.ok) {
        toast.error("Une erreur est survenue, réessayez")
        return
      }
      if (deletesRecord) {
        toast.success("Fiche supprimée : rien ne permettait de reconnaître cette personne")
      } else if (erasure && !erasure.ok) {
        // L'opposition est actée même si l'effacement échoue : la fiche est déjà vidée, seul l'effacement est à rejouer.
        toast.error(
          "Opposition enregistrée, mais l'effacement des échanges a échoué : réessayez depuis Tous",
        )
      } else {
        toast.success("Personne passée en « ne plus contacter »")
      }
      onDone()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button type="button" variant="ghost" className="text-destructive">
          <UserX aria-hidden data-icon="inline-start" />
          {OPTED_OUT_LABEL}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="size-8 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Ne plus contacter « {personDisplayName(person)} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            {deletesRecord
              ? "Sans email ni lien LinkedIn, rien ne permettrait de reconnaître cette personne : sa fiche est supprimée."
              : "La fiche est vidée : seuls l'email, le lien LinkedIn et la date sont gardés, pour ne jamais recontacter cette personne. Ses actions et ses signaux restent dans son historique, sans être réutilisés, sauf si elle en demande l'effacement."}
            {hasContactRole ? " La personne sort aussi de vos contacts." : ""} Action irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {deletesRecord ? null : (
          <label className="flex items-center gap-2 text-sm">
            <Checkbox
              checked={eraseToo}
              onCheckedChange={(checked) => {
                setEraseToo(checked === true)
              }}
            />
            <span>La personne demande aussi l&apos;effacement de nos échanges</span>
          </label>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? "Enregistrement..." : OPTED_OUT_LABEL}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
