import type { ComponentProps } from "react"
import { Pencil } from "lucide-react"

import { RowActionButton } from "@/components/features/admin/table/RowActionButton"

type Props = Omit<ComponentProps<typeof RowActionButton>, "aria-label" | "asChild" | "children"> & {
  label: string
}

export function EditRowButton({ label, ...props }: Props) {
  return (
    <RowActionButton aria-label={label} {...props}>
      <Pencil className="size-4" />
    </RowActionButton>
  )
}
