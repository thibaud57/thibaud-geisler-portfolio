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
import { EmptyValue } from "@/components/features/admin/EmptyValue"
import { TitledBlock } from "@/components/features/admin/TitledBlock"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

export interface DetailRow {
  // Omis quand le titre de la section nomme déjà le champ, seul cas où le répéter serait du bruit.
  label?: string
  // null ou undefined : la valeur absente, rendue en tiret muted ici et pas par chaque écran.
  value: ReactNode
  fullWidth?: boolean
}

export interface DetailSection {
  title?: string
  rows: readonly DetailRow[]
}

export interface DetailContent {
  title: string
  // Sous le titre, comme sous le nom dans la colonne d'ouverture de la liste.
  slug?: string
  subtitle?: ReactNode
  // L'état de l'élément (statut d'un projet, engagement d'une entreprise), à droite du titre.
  status?: ReactNode
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
        <DialogHeader className="shrink-0 pr-8">
          <div className="flex flex-wrap items-center gap-3">
            <DialogTitle>{shown.title}</DialogTitle>
            {shown.status ? <span className="text-sm">{shown.status}</span> : null}
          </div>
          {shown.slug ? (
            <p className="-mt-1 font-mono text-xs text-muted-foreground">{shown.slug}</p>
          ) : null}
          {shown.subtitle ? <DialogDescription>{shown.subtitle}</DialogDescription> : null}
        </DialogHeader>
        {/* overflow-x-hidden : une ligne cliquable étend son fond de survol en marge négative, ce
            qui vaudrait une barre horizontale à une zone qui ne défile que verticalement. */}
        <div className="flex min-h-0 flex-col gap-4 overflow-x-hidden overflow-y-auto">
          {shown.sections.map((section, index) => (
            <Fragment key={index}>
              {index > 0 ? <Separator /> : null}
              <TitledBlock title={section.title} count={section.rows.length}>
                {section.rows.map((row, rowIndex) => (
                  <div
                    key={rowIndex}
                    className={cn(
                      "flex min-w-0 flex-col gap-1.5",
                      row.fullWidth && "sm:col-span-full",
                    )}
                  >
                    {/* Même registre que le Label d'un champ de formulaire : consulter puis
                        modifier doit montrer le même mot, à la même taille. */}
                    {row.label ? (
                      <span className="text-sm leading-none font-medium">{row.label}</span>
                    ) : null}
                    <span className="text-sm wrap-break-word">{row.value ?? <EmptyValue />}</span>
                  </div>
                ))}
              </TitledBlock>
            </Fragment>
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
