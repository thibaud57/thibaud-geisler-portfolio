import type { ComponentProps } from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

type Props = Omit<ComponentProps<typeof Button>, "variant" | "size">

// Les deux actions d'une ligne se lisent comme une paire, pas comme deux boutons séparés :
// d'où une largeur plus étroite que la hauteur. `type="button"` d'office : une action de ligne
// rendue dans un formulaire ne doit jamais le soumettre.
export function RowActionButton({ className, asChild, ...props }: Props) {
  return (
    <Button
      variant="ghost"
      size="icon-sm"
      asChild={asChild}
      type={asChild ? undefined : "button"}
      className={cn("w-5 min-w-5", className)}
      {...props}
    />
  )
}
