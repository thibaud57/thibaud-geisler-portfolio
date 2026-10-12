"use client"

import { useRef, useState, type ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Props {
  children: ReactNode
  className?: string
}

// Mesuré à l'ouverture, donc à jour même si le texte change sans changer la largeur. Le tooltip
// montre le texte brut : y rendre children dupliquerait un lien cliquable.
export function TruncateTooltip({ children, className }: Props) {
  const ref = useRef<HTMLSpanElement>(null)
  const [open, setOpen] = useState(false)
  // Gardé à la fermeture : l'animation de sortie afficherait sinon une bulle vide.
  const [text, setText] = useState<string | null>(null)

  function handleOpenChange(next: boolean) {
    const node = ref.current
    const truncated = next && node !== null && node.scrollWidth > node.clientWidth
    if (truncated) setText(node.textContent)
    setOpen(truncated)
  }

  return (
    <Tooltip open={open} onOpenChange={handleOpenChange}>
      <TooltipTrigger asChild>
        <span ref={ref} className={cn("truncate", className)}>
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent>{text}</TooltipContent>
    </Tooltip>
  )
}
