"use client"

import { useState, useTransition, type MouseEvent } from "react"
import { TriangleAlert, Trash2 } from "lucide-react"
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { deleteTag } from "@/server/actions/tags"
import type { TagDeleteState } from "@/server/actions/tags.types"
import type { AdminTag } from "@/server/queries/tags"

const initialDeleteState: TagDeleteState = { ok: true, message: null }

interface Props {
  tag: AdminTag
}

export function DeleteTagDialog({ tag }: Props) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<TagDeleteState>(initialDeleteState)
  const [pending, startTransition] = useTransition()
  // Connu au rendu, contrairement à state.message === "tag_in_use" (retour serveur) qui reste la
  // seule protection si un rattachement survient entre l'affichage et la confirmation.
  const knownInUseCount = tag._count.projects
  const deniedMessage =
    knownInUseCount > 0
      ? `Ce tag est utilisé par ${knownInUseCount} projet${knownInUseCount > 1 ? "s" : ""} et ne peut pas être supprimé.`
      : state.message === "tag_in_use"
        ? "Ce tag est utilisé par des projets et ne peut pas être supprimé."
        : null

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setState(initialDeleteState)
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
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Supprimer ${tag.nameFr}`}>
              <Trash2 className="size-4" />
            </Button>
          </AlertDialogTrigger>
        </TooltipTrigger>
        <TooltipContent>Supprimer</TooltipContent>
      </Tooltip>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="size-8 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Supprimer le tag « {tag.nameFr} » ?</AlertDialogTitle>
          {/* aria-live : le refus détecté par le serveur arrive après l'ouverture, dans ce même texte. */}
          <AlertDialogDescription
            aria-live="polite"
            className={deniedMessage ? "text-destructive" : undefined}
          >
            {deniedMessage ?? "La suppression est définitive."}
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
