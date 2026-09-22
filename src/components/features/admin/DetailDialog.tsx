"use client"

import { Fragment, useState, type ReactNode } from "react"
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
import { Separator } from "@/components/ui/separator"
import { LABEL_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"

export interface DetailRow {
  // Omis quand le titre de la section nomme déjà le champ, seul cas où le répéter serait du bruit.
  label?: string
  value: ReactNode
  fullWidth?: boolean
}

export interface DetailSection {
  title?: string
  rows: readonly DetailRow[]
}

export interface DetailContent {
  title: string
  subtitle?: ReactNode
  sections: readonly DetailSection[]
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
  // `detail` à `null` dès le clic) : sans ce cache, la modale se viderait avant d'avoir disparu.
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
      {/* Plafond et défilement interne comme AssetPicker : un détail complet dépasse la hauteur de
          l'écran, et le pied doit rester atteignable. `svh`, que la barre d'URL mobile ne fausse pas. */}
      <DialogContent className="flex max-h-[85svh] flex-col sm:max-w-160">
        <DialogHeader className="shrink-0">
          <DialogTitle className="text-lg font-semibold">{shown.title}</DialogTitle>
          {shown.subtitle ? <DialogDescription>{shown.subtitle}</DialogDescription> : null}
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto">
          {shown.sections.map((section, index) => {
            return (
              <Fragment key={index}>
                {index > 0 ? <Separator /> : null}
                <div className="flex flex-col gap-3">
                  {section.title ? (
                    <h3 className={cn(LABEL_CLASS, "text-balance")}>{section.title}</h3>
                  ) : null}
                  <div
                    className={cn(
                      "grid gap-3 gap-x-4",
                      section.rows.length > 1 && "sm:grid-cols-2",
                    )}
                  >
                    {section.rows.map((row, rowIndex) => (
                      <div
                        key={rowIndex}
                        className={cn(
                          "flex min-w-0 flex-col gap-0.5",
                          row.fullWidth && "sm:col-span-full",
                        )}
                      >
                        {row.label ? (
                          <span className="text-xs text-muted-foreground">{row.label}</span>
                        ) : null}
                        <span className="text-sm wrap-break-word">{row.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Fragment>
            )
          })}
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
