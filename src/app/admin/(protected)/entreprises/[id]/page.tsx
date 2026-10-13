import { notFound } from "next/navigation"

import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { CompanyForm } from "@/components/features/admin/companies/CompanyForm"
import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { SignalsCard } from "@/components/features/admin/signals/SignalsCard"
import { getCurrentUser } from "@/lib/get-current-user"
import {
  ADMIN_COMPANIES_PATH,
  ADMIN_LEADS_PATH,
  ADMIN_OPPORTUNITIES_PATH,
} from "@/lib/admin/routes"
import { COMPANY_PAGE_SKELETON } from "@/lib/admin/table-widths"
import { COMPANY_LOGO_FOLDER } from "@/lib/asset-keys"
import { COMPANY_SECTION_TITLES, companyOpportunities } from "@/lib/crm/companies"
import { toLeadLink } from "@/lib/crm/leads"
import { toOpportunityLink } from "@/lib/crm/opportunities"
import { findCompanyByIdForAdmin } from "@/server/queries/companies"
import { listAdminAssets } from "@/server/queries/assets"
import { findLeadsOfCompany } from "@/server/queries/leads"

async function EditCompanySection({ id }: { id: string }) {
  const [company, logoAssets, leads] = await Promise.all([
    findCompanyByIdForAdmin(id),
    listAdminAssets(COMPANY_LOGO_FOLDER),
    findLeadsOfCompany(id),
  ])
  if (!company) notFound()

  return (
    <AdminFormContent
      breadcrumb={[{ label: "Entreprises", href: ADMIN_COMPANIES_PATH }, { label: company.name }]}
    >
      <CompanyForm
        company={company}
        logoAssets={logoAssets}
        relatedCards={
          <>
            <RelatedLinksCard
              title={COMPANY_SECTION_TITLES.leads}
              links={leads.map((lead) =>
                toLeadLink(
                  { ...lead.person, id: lead.personId, createdAt: lead.createdAt },
                  { href: `${ADMIN_LEADS_PATH}/${lead.personId}` },
                ),
              )}
              emptyText="Aucun lead dans cette entreprise."
            />
            <RelatedLinksCard
              title={COMPANY_SECTION_TITLES.opportunities}
              links={companyOpportunities(company).map(({ opportunity, role }) =>
                toOpportunityLink(opportunity, {
                  href: `${ADMIN_OPPORTUNITIES_PATH}/${opportunity.id}`,
                  metaSuffix: role,
                  idPrefix: role,
                }),
              )}
              emptyText="Aucune opportunité pour cette entreprise."
            />
            <SignalsCard
              signals={company.signals}
              owner={{ kind: "company", id: company.id, name: company.name }}
              canAdd
            />
          </>
        }
      />
    </AdminFormContent>
  )
}

export default async function EditCompanyPage({ params }: PageProps<"/admin/entreprises/[id]">) {
  await getCurrentUser()
  const { id } = await params

  return (
    <AdminFormPage skeleton={COMPANY_PAGE_SKELETON}>
      <EditCompanySection id={id} />
    </AdminFormPage>
  )
}
