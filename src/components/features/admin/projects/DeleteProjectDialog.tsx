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
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { Button } from "@/components/ui/button"
import { deleteProject } from "@/server/actions/projects"

interface Props {
  project: { id: string; titleFr: string }
  trigger: "icon" | "text"
}

export function DeleteProjectDialog({ project, trigger }: Props) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  // AlertDialogAction ferme la modale par défaut (DialogPrimitive.Close sous-jacent) : preventDefault
  // retarde la fermeture jusqu'à la résolution de deleteProject, au lieu de fermer immédiatement au clic.
  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await deleteProject(project.id)
      if (result.ok) {
        toast.success("Projet supprimé")
      } else {
        toast.error("Une erreur est survenue, réessayez")
      }
      setOpen(false)
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      {trigger === "icon" ? (
        <AlertDialogTrigger asChild>
          <RowActionButton aria-label={`Supprimer ${project.titleFr}`}>
            <Trash2 className="size-4" />
          </RowActionButton>
        </AlertDialogTrigger>
      ) : (
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Supprimer
          </Button>
        </AlertDialogTrigger>
      )}
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogMedia>
            <TriangleAlert className="size-8 text-destructive" />
          </AlertDialogMedia>
          <AlertDialogTitle>Supprimer « {project.titleFr} » ?</AlertDialogTitle>
          <AlertDialogDescription>
            Le projet, sa méta client et ses rattachements de tags partent en cascade. Rien
            n&apos;est récupérable. Les tags et l&apos;entreprise, eux, restent en base.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction variant="destructive" disabled={pending} onClick={handleConfirm}>
            {pending ? "Suppression..." : "Supprimer le projet"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
