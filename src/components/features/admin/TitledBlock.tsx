import type { ReactNode } from "react"

import { LABEL_CLASS } from "@/lib/typography"
import { cn } from "@/lib/utils"

interface Props {
  title?: string
  // Nombre d'éléments de la grille : la seule règle de disposition de l'admin, deux colonnes dès
  // qu'il y en a plus d'un, vit ici et nulle part ailleurs (docs/DESIGN.md § Arbitrages).
  count: number
  className?: string
  gridClassName?: string
  children: ReactNode
}

// Bloc titré d'une vue détail ou d'un panneau de la barre d'outils : même titre, même grille.
export function TitledBlock({ title, count, className, gridClassName, children }: Props) {
  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {title ? <h3 className={cn(LABEL_CLASS, "text-balance")}>{title}</h3> : null}
      <div className={cn("grid gap-3 gap-x-4", count > 1 && "sm:grid-cols-2", gridClassName)}>
        {children}
      </div>
    </div>
  )
}
