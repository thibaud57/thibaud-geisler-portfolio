"use client"

import { useLayoutEffect, useRef, useState, type ReactNode } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface Props {
  children: ReactNode
  className?: string
}

// Le Tooltip enveloppe ce span dès le premier rendu, jamais seulement une fois isTruncated connu :
// changer sa structure après coup swap le nœud DOM mesuré et fausse la mesure suivante. Seul le
// rendu de TooltipContent (un frère, pas un ancêtre du span) varie avec isTruncated.
export function TruncateTooltip({ children, className }: Props) {
  const containerRef = useRef<HTMLSpanElement>(null)
  const [isTruncated, setIsTruncated] = useState(false)

  useLayoutEffect(() => {
    const node = containerRef.current
    if (!node) return

    function measure(target: HTMLSpanElement) {
      setIsTruncated(target.scrollWidth > target.clientWidth)
    }

    measure(node)
    const observer = new ResizeObserver(() => {
      measure(node)
    })
    observer.observe(node)
    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span ref={containerRef} className={cn("truncate", className)}>
          {children}
        </span>
      </TooltipTrigger>
      {isTruncated ? <TooltipContent>{children}</TooltipContent> : null}
    </Tooltip>
  )
}
