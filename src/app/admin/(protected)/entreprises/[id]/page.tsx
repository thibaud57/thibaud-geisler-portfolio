import { notFound } from "next/navigation"
import { Suspense } from "react"

import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { CompanyForm } from "@/components/features/admin/companies/CompanyForm"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { COMPANY_LOGO_FOLDER } from "@/lib/asset-keys"
import { findAvailableLegalEntities, findCompanyByIdForAdmin } from "@/server/queries/companies"
import { listAdminAssets } from "@/server/queries/assets"

async function EditCompanySection({ id }: { id: string }) {
  const [company, legalEntities, logoAssets] = await Promise.all([
    findCompanyByIdForAdmin(id),
    findAvailableLegalEntities(id),
    listAdminAssets(COMPANY_LOGO_FOLDER),
  ])
  if (!company) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Entreprises", href: "/admin/entreprises" }, { label: company.name }]}
      />
      <CompanyForm company={company} legalEntities={legalEntities} logoAssets={logoAssets} />
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
