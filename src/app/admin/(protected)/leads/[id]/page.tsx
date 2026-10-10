import { notFound, redirect } from "next/navigation"
import { Suspense } from "react"

import { LeadActionsCard } from "@/components/features/admin/leads/LeadActionsCard"
import { LeadForm } from "@/components/features/admin/leads/LeadForm"
import { RelatedLinksCard } from "@/components/features/admin/RelatedLinksCard"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { ADMIN_LEADS_PATH, ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin-routes"
import { LEAD_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { LEAD_SECTION_TITLES } from "@/lib/leads"
import { toOpportunityLink } from "@/lib/opportunities"
import { personDisplayName } from "@/lib/persons"
import { findCompanyOptions } from "@/server/queries/companies"
import { findLeadByIdForAdmin } from "@/server/queries/leads"
import { findProspectingActionsOfPerson } from "@/server/queries/prospecting-actions"

async function EditLeadSection({ id }: { id: string }) {
  const [lead, companyOptions, actions] = await Promise.all([
    findLeadByIdForAdmin(id),
    findCompanyOptions(),
    findProspectingActionsOfPerson(id),
  ])
  if (!lead) notFound()
  // Une fiche en opposition ne se modifie plus : sa trace se lit dans Tous.
  if (lead.optedOutAt) redirect(ADMIN_LEADS_PATH)

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Leads", href: "/admin/leads" }, { label: personDisplayName(lead) }]}
      />
      <LeadForm
        lead={lead}
        companyOptions={companyOptions}
        relatedCards={
          <>
            <LeadActionsCard lead={lead} actions={actions} />
            <RelatedLinksCard
              title={LEAD_SECTION_TITLES.opportunities}
              links={lead.opportunities.map((opportunity) =>
                toOpportunityLink(opportunity, {
                  href: `${ADMIN_OPPORTUNITIES_PATH}/${opportunity.id}`,
                  metaSuffix: opportunity.client?.name,
                }),
              )}
              emptyText="Aucune opportunité apportée par ce lead."
            />
          </>
        }
      />
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
