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
import { deleteCompany } from "@/server/actions/companies"
import type { CompanyFormMessage } from "@/server/actions/companies.types"
import type { AdminCompany } from "@/server/queries/companies"

interface Props {
  company: AdminCompany
}

export function DeleteCompanyDialog({ company }: Props) {
  const [open, setOpen] = useState(false)
  const [message, setMessage] = useState<CompanyFormMessage>(null)
  const [pending, startTransition] = useTransition()
  // Connu au rendu, contrairement à message === "company_in_use" (retour serveur) qui reste
  // la seule protection si un projet se rattache entre l'affichage et la confirmation.
  const knownInUseCount = company._count.clientMetas
  const deniedMessage =
    knownInUseCount > 0
      ? `Cette entreprise est rattachée à ${knownInUseCount} projet${knownInUseCount > 1 ? "s" : ""} et ne peut pas être supprimée.`
      : message === "company_in_use"
        ? "Cette entreprise est rattachée à des projets et ne peut pas être supprimée."
        : null

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setMessage(null)
    }
  }

  // AlertDialogAction ferme la modale par défaut (DialogPrimitive.Close sous-jacent) : preventDefault
  // systématique pour garder la main sur la fermeture selon le résultat de deleteCompany.
  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await deleteCompany(company.id)
      if (result.ok) {
        toast.success("Entreprise supprimée")
        setOpen(false)
      } else if (result.message === "unknown_error") {
        toast.error("Une erreur est survenue, réessayez")
        setOpen(false)
      } else {
        setMessage(result.message)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <Tooltip>
        <TooltipTrigger asChild>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              // Les deux actions d'une ligne se lisent comme une paire, pas comme deux boutons
              // séparés : d'où une largeur plus étroite que la hauteur.
              className="w-5 min-w-5"
              aria-label={`Supprimer ${company.name}`}
            >
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
          <AlertDialogTitle>Supprimer « {company.name} » ?</AlertDialogTitle>
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
