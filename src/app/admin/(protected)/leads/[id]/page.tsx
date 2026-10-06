import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import { LeadForm } from "@/components/features/admin/leads/LeadForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { ADMIN_LEADS_PATH } from "@/lib/admin-routes"
import { LEAD_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { personDisplayName } from "@/lib/persons"
import { findCompanyOptions } from "@/server/queries/companies"
import { findLeadByIdForAdmin } from "@/server/queries/leads"

async function EditLeadSection({ id }: { id: string }) {
  const [lead, companyOptions] = await Promise.all([findLeadByIdForAdmin(id), findCompanyOptions()])
  if (!lead) notFound()
  // Une fiche en opposition ne se modifie plus : sa trace se lit dans Tous.
  if (lead.optedOutAt) redirect(ADMIN_LEADS_PATH)

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Leads", href: "/admin/leads" }, { label: personDisplayName(lead) }]}
      />
      <LeadForm lead={lead} companyOptions={companyOptions} />
    </div>
  )
}

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={LEAD_PAGE_SKELETON} />}>
        <EditLeadSection id={id} />
      </Suspense>
    </div>
  )
}
