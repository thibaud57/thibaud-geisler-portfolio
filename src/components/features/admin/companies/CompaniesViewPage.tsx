import { CompaniesTable } from "@/components/features/admin/companies/CompaniesTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { ADMIN_COMPANIES_PATH } from "@/lib/admin/routes"
import { companySkeletonWidths } from "@/components/features/admin/companies/company-table-widths"
import { COMPANY_VIEW_PAGES, type CompanyView } from "@/lib/crm/company-views"
import { findAllCompaniesForAdmin } from "@/server/queries/companies"

interface Props {
  view: CompanyView
  initialDetailId?: string
}

async function CompaniesSection({ view, initialDetailId }: Props) {
  const companies = await findAllCompaniesForAdmin()
  return <CompaniesTable companies={companies} view={view} initialDetailId={initialDetailId} />
}

export function CompaniesViewPage({ view, initialDetailId }: Props) {
  const { title, subtitle } = COMPANY_VIEW_PAGES[view]

  return (
    <AdminListPage
      title={title}
      subtitle={subtitle}
      create={{ href: `${ADMIN_COMPANIES_PATH}/nouvelle`, label: "Nouvelle entreprise" }}
      skeletonWidths={companySkeletonWidths(view)}
    >
      <CompaniesSection view={view} initialDetailId={initialDetailId} />
    </AdminListPage>
  )
}
