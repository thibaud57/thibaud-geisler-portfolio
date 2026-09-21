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
import { nameOfAssetKey } from "@/lib/assets"
import { isHardcodedAssetKey } from "@/lib/schemas/asset"
import { deleteAsset } from "@/server/actions/assets"
import type { AssetFormMessage } from "@/server/actions/assets.types"

interface Props {
  assetKey: string
  usedBy: readonly string[]
}

const HARDCODED_DENIAL_MESSAGE =
  "Ce fichier est référencé en dur dans le code du site. Il se remplace par un dépôt sur la même clé, il ne se supprime pas ici."

// Un seul gabarit, quel que soit le nombre de rattachements : deleteAsset ne dit pas leur nature
// (couverture, logo, case study), seulement leurs slugs.
function formatDenialMessage(usedBy: readonly string[]): string {
  const names = usedBy.map((slug) => `« ${slug} »`)
  const joined = new Intl.ListFormat("fr", { style: "long", type: "conjunction" }).format(names)
  const rattachement = usedBy.length > 1 ? "les rattachements" : "le rattachement"
  return `Ce fichier est utilisé par ${joined}. Retirez ${rattachement} avant de le supprimer.`
}

interface ServerRefusal {
  message: AssetFormMessage
  usedBy: string[]
}

export function DeleteAssetDialog({ assetKey, usedBy }: Props) {
  const [open, setOpen] = useState(false)
  const [serverRefusal, setServerRefusal] = useState<ServerRefusal | null>(null)
  const [pending, startTransition] = useTransition()
  const hardcoded = isHardcodedAssetKey(assetKey)
  // Connu au rendu (résolu par la page via resolveAssetUsage), contrairement à
  // message === "asset_in_use" qui reste la seule protection si un rattachement survient
  // entre l'affichage et la confirmation.
  const effectiveUsedBy =
    usedBy.length > 0
      ? usedBy
      : serverRefusal?.message === "asset_in_use"
        ? serverRefusal.usedBy
        : []
  // asset_hardcoded ne vient normalement jamais d'ici (déclencheur disabled), seulement si
  // deleteAsset est appelée autrement que par cet écran.
  const deniedMessage =
    serverRefusal?.message === "asset_hardcoded"
      ? HARDCODED_DENIAL_MESSAGE
      : effectiveUsedBy.length > 0
        ? formatDenialMessage(effectiveUsedBy)
        : null

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) {
      setServerRefusal(null)
    }
  }

  // AlertDialogAction ferme la modale par défaut (DialogPrimitive.Close sous-jacent) : preventDefault
  // systématique pour garder la main sur la fermeture selon le résultat de deleteAsset.
  function handleConfirm(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault()
    startTransition(async () => {
      const result = await deleteAsset(assetKey)
      if (result.ok) {
        toast.success("Fichier supprimé")
        setOpen(false)
      } else if (result.message === "unknown_error") {
        toast.error("Une erreur est survenue, réessayez")
        setOpen(false)
      } else {
        setServerRefusal({ message: result.message, usedBy: result.usedBy ?? [] })
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
              // Les deux actions d'une tuile se lisent comme une paire, pas comme deux boutons
              // séparés : d'où une largeur plus étroite que la hauteur.
              className="w-5 min-w-5"
              aria-label={`Supprimer ${assetKey}`}
              disabled={hardcoded}
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
          <AlertDialogTitle>Supprimer « {nameOfAssetKey(assetKey)} » ?</AlertDialogTitle>
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
