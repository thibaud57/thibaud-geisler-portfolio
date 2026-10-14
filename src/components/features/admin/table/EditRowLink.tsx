import type { Route } from "next"
import { Pencil } from "lucide-react"
import Link from "next/link"

import { RowActionButton } from "@/components/features/admin/table/RowActionButton"

interface Props<T extends string> {
  href: Route<T>
  label: string
}

export function EditRowLink<T extends string>({ href, label }: Props<T>) {
  return (
    <RowActionButton aria-label={label} asChild>
      <Link href={href}>
        <Pencil className="size-4" />
      </Link>
    </RowActionButton>
  )
}
