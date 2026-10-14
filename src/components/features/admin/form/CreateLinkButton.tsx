import type { ComponentProps } from "react"
import type { Route } from "next"
import { Plus } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"

type ButtonStyle = Pick<ComponentProps<typeof Button>, "variant" | "size">

interface Props<T extends string> extends ButtonStyle {
  href: Route<T>
  label: string
}

export function CreateLinkButton<T extends string>({ href, label, variant, size }: Props<T>) {
  return (
    <Button asChild variant={variant} size={size}>
      <Link href={href}>
        <Plus aria-hidden data-icon="inline-start" />
        {label}
      </Link>
    </Button>
  )
}
