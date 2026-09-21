import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = Omit<ComponentProps<typeof Button>, "variant" | "size">

// Les deux actions d'une ligne se lisent comme une paire, pas comme deux boutons séparés :
// d'où une largeur plus étroite que la hauteur.
export function RowActionButton({ className, ...props }: Props) {
  return (
    <Button variant="ghost" size="icon-sm" className={cn("w-5 min-w-5", className)} {...props} />
  )
}
