"use client"

import { Maximize2, X } from "lucide-react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { Dialog as DialogPrimitive } from "radix-ui"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

type Sizing =
  { fill: true; width?: never; height?: never } | { fill?: never; width: number; height: number }

type Props = Sizing & {
  src: string
  alt: string
  sizes: string
  preload?: boolean
  className?: string
  imageClassName?: string
}

// Taille réelle inconnue : ne fixe que le ratio avant chargement, w-auto/h-auto prennent la taille naturelle.
const ZOOMED_SIZE_HINT = { width: 1600, height: 900 }

export function ZoomableImage({
  src,
  alt,
  sizes,
  preload,
  className,
  imageClassName,
  ...sizing
}: Props) {
  const t = useTranslations("Projects.caseStudy.zoom")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={alt ? t("open", { alt }) : t("openUntitled")}
          className={cn(
            "relative block w-full outline-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring/50",
            sizing.fill && "h-full",
            className,
          )}
        >
          <Image
            src={src}
            alt={alt}
            sizes={sizes}
            preload={preload}
            className={imageClassName}
            {...sizing}
          />
          <span
            aria-hidden="true"
            className="absolute top-3 right-3 flex size-8 items-center justify-center rounded-lg border border-border bg-background/80 text-foreground backdrop-blur-sm"
          >
            <Maximize2 className="size-4" />
          </span>
        </button>
      </DialogTrigger>
      {/* Toujours sombre. Plein écran pour Fermer dans le coin : le clic hors image tombe sur le contenu, d'où le onClick. */}
      <DialogPortal>
        <DialogOverlay className="dark bg-background/90" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onClick={(event) => {
            if (event.target === event.currentTarget) setOpen(false)
          }}
          className="dark fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4 duration-100 outline-none sm:px-16 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"
        >
          <DialogClose asChild>
            <Button
              variant="outline"
              size="icon"
              aria-label={t("close")}
              className="absolute top-4 right-4"
            >
              <X />
            </Button>
          </DialogClose>
          <Image
            src={src}
            alt={alt}
            sizes="92vw"
            {...ZOOMED_SIZE_HINT}
            className="h-auto max-h-[80dvh] w-auto max-w-full rounded-lg border border-border"
          />
          <DialogTitle
            className={
              alt
                ? "text-center text-sm leading-normal font-normal text-muted-foreground"
                : "sr-only"
            }
          >
            {alt || t("title")}
          </DialogTitle>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
