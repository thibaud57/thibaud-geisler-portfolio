"use client"

import { useState, type ReactNode } from "react"
import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { LABEL_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"

export interface DetailRow {
  label: string
  value: ReactNode
  fullWidth?: boolean
}

export interface DetailContent {
  title: string
  subtitle?: ReactNode
  rows: readonly DetailRow[]
  // Navigation (Entreprises, Projets) ou ouverture d'une autre modale (Tags) : au composant de
  // rester ignorant du cas, il se contente d'appeler ce callback après sa propre fermeture.
  onEdit: () => void
}

interface Props {
  detail: DetailContent | null
  onOpenChange: (open: boolean) => void
}

export function DetailDialog({ detail, onOpenChange }: Props) {
  // Le contenu doit rester affiché pendant l'animation de fermeture (le consommateur remet
  // `detail` à null dès le clic) : sans ce cache, la modale se viderait avant d'avoir disparu.
  const [shown, setShown] = useState<DetailContent | null>(null)
  if (detail && detail !== shown) setShown(detail)

  function handleEdit() {
    onOpenChange(false)
    const onEdit = shown?.onEdit
    if (onEdit) {
      // Laisse le Dialog démarrer sa fermeture avant d'ouvrir la suite : Radix maintient
      // pointer-events:none sur le body tant qu'il reste monté.
      window.setTimeout(onEdit, 0)
    }
  }

  if (!shown) return null

  return (
    <Dialog open={detail !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-160">
        <DialogHeader>
          <DialogTitle>{shown.title}</DialogTitle>
          {shown.subtitle ? <DialogDescription>{shown.subtitle}</DialogDescription> : null}
        </DialogHeader>
        <div className="grid gap-3 gap-x-4 sm:grid-cols-2">
          {shown.rows.map((row) => (
            <div
              key={row.label}
              className={cn("flex min-w-0 flex-col gap-0.5", row.fullWidth && "sm:col-span-2")}
            >
              <span className={LABEL_CLASS}>{row.label}</span>
              <span className="text-sm wrap-break-word">{row.value}</span>
            </div>
          ))}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Fermer
            </Button>
          </DialogClose>
          <Button type="button" onClick={handleEdit}>
            <Pencil aria-hidden data-icon="inline-start" />
            Modifier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
