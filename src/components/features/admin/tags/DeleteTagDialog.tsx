"use client"

import { useState, useTransition, type MouseEvent } from "react"
import { Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import type { Tag } from "@/generated/prisma/client"
import { deleteTag } from "@/server/actions/tags"
import { initialTagFormState, type TagFormState } from "@/server/actions/tags.types"

interface Props {
  tag: Tag
}

export function DeleteTagDialog({ tag }: Props) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<TagFormState>(initialTagFormState)
  const [pending, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setState(initialTagFormState)
    }
  }

  // AlertDialogAction ferme la modale par défaut (DialogPrimitive.Close sous-jacent) : preventDefault
  // systématique pour garder la main sur la fermeture selon le résultat de deleteTag.
  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await deleteTag(tag.id)
      if (result.ok) {
        toast.success("Tag supprimé")
        setOpen(false)
      } else if (result.message === "unknown_error") {
        toast.error("Une erreur est survenue, réessayez")
        setOpen(false)
      } else {
        setState(result)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label={`Supprimer ${tag.nameFr}`}>
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer {tag.nameFr} ?</AlertDialogTitle>
          <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
        </AlertDialogHeader>
        <div aria-live="polite">
          {state.message === "tag_in_use" ? (
            <p className="text-sm text-destructive">
              Ce tag est utilisé par des projets et ne peut pas être supprimé.
            </p>
          ) : null}
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? "Suppression..." : "Supprimer"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
