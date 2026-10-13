import { Suspense, type ReactNode } from "react"
import type { Route } from "next"

import { CreateLinkButton } from "@/components/features/admin/form/CreateLinkButton"
import { DataTableSkeleton } from "@/components/features/admin/table/DataTableSkeleton"
import { AdminPageShell } from "@/components/layout/admin/AdminPageShell"

interface Props<T extends string> {
  title: string
  subtitle?: string
  create?: { href: Route<T>; label: string }
  actions?: ReactNode
  skeletonWidths: readonly number[]
  children: ReactNode
}

export function AdminListPage<T extends string>({
  title,
  subtitle,
  create,
  actions,
  skeletonWidths,
  children,
}: Props<T>) {
  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={create ? <CreateLinkButton href={create.href} label={create.label} /> : actions}
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={skeletonWidths} />}>{children}</Suspense>
    </AdminPageShell>
  )
}
