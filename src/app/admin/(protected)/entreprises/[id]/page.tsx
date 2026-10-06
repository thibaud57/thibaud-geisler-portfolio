import { notFound } from "next/navigation"
import { Suspense } from "react"

import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { CompanyForm } from "@/components/features/admin/companies/CompanyForm"
import { RelatedLinksCard } from "@/components/features/admin/RelatedLinksCard"
import type { RelatedLink } from "@/components/features/admin/RelatedLinksList"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { COMPANY_LOGO_FOLDER } from "@/lib/asset-keys"
import { COMPANY_SECTION_TITLES } from "@/lib/companies"
import { JOB_ROLE_LABELS } from "@/lib/job-roles"
import { personDisplayName } from "@/lib/persons"
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
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Entreprises", href: "/admin/entreprises" }, { label: company.name }]}
      />
      <CompanyForm
        company={company}
        logoAssets={logoAssets}
        relatedCards={
          <RelatedLinksCard
            title={COMPANY_SECTION_TITLES.leads}
            links={leads.map((lead): RelatedLink => ({
              id: lead.personId,
              href: `/admin/leads/${lead.personId}`,
              label: personDisplayName(lead.person),
              ...(lead.person.jobRole ? { meta: JOB_ROLE_LABELS[lead.person.jobRole] } : {}),
            }))}
            emptyText="Aucun lead dans cette entreprise."
          />
        }
      />
    </div>
  )
}

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense
        fallback={
          <StackedSkeleton
            heights={["h-[24px]", "h-[260px]", "h-[160px]", "h-[140px]", "h-[220px]"]}
          />
        }
      >
        <EditCompanySection id={id} />
      </Suspense>
    </div>
  )
}
