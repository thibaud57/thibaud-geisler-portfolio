import { Suspense } from "react"

import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { CompanyForm } from "@/components/features/admin/companies/CompanyForm"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { COMPANY_LOGO_FOLDER } from "@/lib/schemas/asset"
import { findAvailableLegalEntities } from "@/server/queries/companies"
import { listAdminAssets } from "@/server/queries/assets"

async function NewCompanySection() {
  const [legalEntities, logoAssets] = await Promise.all([
    findAvailableLegalEntities(),
    listAdminAssets(COMPANY_LOGO_FOLDER),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: "Entreprises", href: "/admin/entreprises" },
          { label: "Nouvelle entreprise" },
        ]}
      />
      <CompanyForm company={null} legalEntities={legalEntities} logoAssets={logoAssets} />
    </div>
  )
}

export default async function NewCompanyPage() {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense
        fallback={
          <StackedSkeleton
            heights={["h-[24px]", "h-[260px]", "h-[160px]", "h-[140px]", "h-[220px]"]}
          />
        }
      >
        <NewCompanySection />
      </Suspense>
    </div>
  )
}
