import { Suspense, type ReactNode } from "react"

import { AdminBreadcrumb, type BreadcrumbEntry } from "@/components/layout/admin/AdminBreadcrumb"
import { ADMIN_PAGE_PADDING } from "@/components/layout/admin/AdminPageShell"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { cn } from "@/lib/utils"

interface PageProps {
  skeleton: readonly string[]
  children: ReactNode
}

export function AdminFormPage({ skeleton, children }: PageProps) {
  return (
    <div className={cn("w-full", ADMIN_PAGE_PADDING)}>
      <Suspense fallback={<StackedSkeleton heights={skeleton} />}>{children}</Suspense>
    </div>
  )
}

interface ContentProps {
  breadcrumb: BreadcrumbEntry[]
  children: ReactNode
}

// Dans la section async : le dernier élément du fil d'Ariane nomme la fiche chargée.
export function AdminFormContent({ breadcrumb, children }: ContentProps) {
  return (
    <div className="flex flex-col gap-4">
      <AdminBreadcrumb items={breadcrumb} />
      {children}
    </div>
  )
}
