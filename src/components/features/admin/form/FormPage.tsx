import type { Route } from "next"
import type { ReactNode, SubmitEvent } from "react"
import { Save } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

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
  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">{title}</h1>
        <div className="flex flex-wrap gap-2">
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
        <div className="flex min-w-0 flex-col gap-4 lg:sticky lg:top-18">{aside}</div>
      </div>
    </form>
  )
}
