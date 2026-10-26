"use client"

import type { Route } from "next"
import { type ReactNode, type SubmitEvent, useRef } from "react"
import { Save } from "lucide-react"
import Link from "next/link"

import { ADMIN_PAGE_BLEED } from "@/components/layout/admin/AdminPageShell"
import { Button } from "@/components/ui/button"
import { useIsStuck } from "@/hooks/use-is-stuck"
import { cn } from "@/lib/utils"

interface Props<T extends string> {
  title: string
  cancelHref: Route<T>
  pending: boolean
  onSubmit: (event: SubmitEvent<HTMLFormElement>) => void
  main: ReactNode
  aside: ReactNode
  actions?: ReactNode
}

export function FormPage<T extends string>({
  title,
  cancelHref,
  pending,
  onSubmit,
  main,
  aside,
  actions,
}: Props<T>) {
  const barRef = useRef<HTMLDivElement>(null)
  const stuck = useIsStuck(barRef)

  return (
    <form
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4 [--form-bar-h:--spacing(14)]"
    >
      {/* Une ligne dès lg pour tenir --form-bar-h ; -my-3 compense py-3 au repos. */}
      <div
        ref={barRef}
        className={cn(
          "sticky top-0 z-10 flex min-h-(--form-bar-h) flex-wrap items-center justify-between gap-4",
          "-my-3 py-3",
          ADMIN_PAGE_BLEED,
          "bg-background/80",
          "backdrop-blur after:absolute after:inset-x-0 after:bottom-0 after:h-px after:bg-border after:opacity-0",
          stuck && "after:opacity-100",
          "lg:flex-nowrap",
        )}
      >
        <h1 className="min-w-0 truncate font-sans text-2xl font-semibold tracking-tight">
          {title}
        </h1>
        <div className="flex flex-wrap gap-2 lg:shrink-0">
          {actions}
          <Button type="button" variant="ghost" asChild>
            <Link href={cancelHref}>Annuler</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            <Save aria-hidden data-icon="inline-start" />
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex min-w-0 flex-col gap-4">{main}</div>
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-[calc(var(--form-bar-h)+(--spacing(4)))]">
          {aside}
        </div>
      </div>
    </form>
  )
}
