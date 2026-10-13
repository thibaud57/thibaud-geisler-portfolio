"use client"

import { Fragment, useState, type ReactNode } from "react"
import { Pencil } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AssetTileLink } from "@/components/features/admin/detail/AssetTileLink"
import { EmptyValue } from "@/components/features/admin/display/EmptyValue"
import { EnumBadge } from "@/components/features/admin/display/EnumBadge"
import { TitledBlock } from "@/components/features/admin/display/TitledBlock"
import { Separator } from "@/components/ui/separator"
import type { IconComponent } from "@/lib/icons"
import { cn } from "@/lib/utils"

export interface DetailRow {
  // Omis quand le titre de la section nomme déjà le champ, seul cas où le répéter serait du bruit.
  label?: string
  // null ou undefined : la valeur absente, rendue en tiret muted ici et pas par chaque écran.
  value: ReactNode
  // Texte long ou liste de fiches liées seulement : tout autre champ tient dans une colonne.
  fullWidth?: boolean
}

export interface DetailSection {
  title?: string
  rows: readonly DetailRow[]
}

export interface DetailBadge {
  label: string
  icon?: IconComponent | null
}

// L'en-tête ne reçoit que des données : chaque vue détail le rend à l'identique, sans JSX propre à un écran.
export interface DetailContent {
  // Image d'identité (logo d'entreprise, couverture de projet) : une tuile neutre quand le fichier manque.
  image?: { assetKey: string | null }
  title: string
  // Le slug pour une fiche qui en a un (entreprise, projet, tag), sinon une précision courte (poste, rôle, date).
  subtitle?: string
  // Statut d'abord, puis nature ou catégorie. null est ignoré, pour un statut facultatif.
  badges?: readonly (DetailBadge | null)[]
  sections: readonly DetailSection[]
  // Appelé après la fermeture : le composant ignore s'il s'agit d'une navigation ou de l'ouverture d'une autre modale.
  onEdit?: () => void
}

export function headerBadge<V extends string>(
  value: V | null,
  labels: Record<V, string>,
  icons?: Record<V, IconComponent | null>,
): DetailBadge | null {
  return value ? { label: labels[value], icon: icons?.[value] ?? null } : null
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
      {/* Plafond et défilement interne : un détail complet dépasse la hauteur de l'écran, et le
          pied doit rester atteignable. `svh`, que la barre d'URL mobile ne fausse pas. */}
      {/* Radix saute les liens et focaliserait le premier déclencheur d'infobulle d'une valeur :
          l'infobulle s'ouvrirait seule et le premier Échap la fermerait au lieu de la modale. */}
      <DialogContent
        className="flex max-h-[85svh] flex-col sm:max-w-160"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          if (event.currentTarget instanceof HTMLElement) event.currentTarget.focus()
        }}
      >
        <DialogHeader className="shrink-0 flex-row items-center gap-3 pr-8">
          {shown.image ? (
            <div className="shrink-0">
              <AssetTileLink assetKey={shown.image.assetKey} name={shown.title} />
            </div>
          ) : null}
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <DialogTitle>{shown.title}</DialogTitle>
            {shown.subtitle ? <DialogDescription>{shown.subtitle}</DialogDescription> : null}
          </div>
          {/* En haut à droite, contre la croix de fermeture que réserve le pr-8. */}
          <div className="flex shrink-0 flex-wrap justify-end gap-2 self-start">
            {shown.badges?.map((badge) =>
              badge ? (
                <EnumBadge
                  key={badge.label}
                  label={badge.label}
                  icon={badge.icon ?? null}
                  variant="outline"
                  meta
                />
              ) : null,
            )}
          </div>
        </DialogHeader>
        {/* overflow-x-hidden : une ligne cliquable étend son fond de survol en marge négative, ce
            qui vaudrait une barre horizontale à une zone qui ne défile que verticalement. */}
        <DialogBody className="flex flex-col gap-4 overflow-x-hidden">
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
                    {/* Consulter puis modifier doit montrer le même mot, à la même taille. */}
                    {row.label ? (
                      <span className="text-sm leading-none font-medium">{row.label}</span>
                    ) : null}
                    <span className="text-sm wrap-break-word">{row.value ?? <EmptyValue />}</span>
                  </div>
                ))}
              </TitledBlock>
            </Fragment>
          ))}
        </DialogBody>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Fermer
            </Button>
          </DialogClose>
          {shown.onEdit ? (
            <Button type="button" onClick={handleEdit}>
              <Pencil aria-hidden data-icon="inline-start" />
              Modifier
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
