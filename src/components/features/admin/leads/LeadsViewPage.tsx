import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { LeadsTable } from "@/components/features/admin/leads/LeadsTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { leadSkeletonWidths } from "@/lib/admin-table-widths"
import { LEAD_VIEW_PAGES, type LeadView } from "@/lib/lead-views"
import { findAllLeadsForAdmin } from "@/server/queries/leads"

interface Props {
  view: LeadView
  initialDetailId?: string
}

async function LeadsSection({ view, initialDetailId }: Props) {
  const leads = await findAllLeadsForAdmin()
  return <LeadsTable leads={leads} view={view} initialDetailId={initialDetailId} />
}

export function LeadsViewPage({ view, initialDetailId }: Props) {
  const { title, subtitle } = LEAD_VIEW_PAGES[view]

  return (
    <AdminPageShell
      title={title}
      subtitle={subtitle}
      actions={
        <Button asChild>
          <Link href="/admin/leads/nouveau">
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau lead
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={leadSkeletonWidths(view)} />}>
        <LeadsSection view={view} initialDetailId={initialDetailId} />
      </Suspense>
    </AdminPageShell>
  )
}
