import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { CompanyForm } from "@/components/features/admin/companies/CompanyForm"
import { PendingRelatedCard } from "@/components/features/admin/detail/PendingRelatedCard"
import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { ADMIN_COMPANIES_PATH } from "@/lib/admin/routes"
import { COMPANY_PAGE_SKELETON } from "@/components/features/admin/companies/company-table-widths"
import { COMPANY_LOGO_FOLDER } from "@/lib/asset-keys"
import { COMPANY_SECTION_TITLES } from "@/lib/crm/companies"
import { getCurrentUser } from "@/lib/get-current-user"
import { SIGNAL_SECTION_TITLES } from "@/lib/crm/signals"
import { listAdminAssets } from "@/server/queries/assets"

const PENDING_TEXT = "Après l'enregistrement de l'entreprise."

async function NewCompanySection() {
  const logoAssets = await listAdminAssets(COMPANY_LOGO_FOLDER)

  return (
    <AdminFormContent
      breadcrumb={[
        { label: "Entreprises", href: ADMIN_COMPANIES_PATH },
        { label: "Nouvelle entreprise" },
      ]}
    >
      <CompanyForm
        company={null}
        logoAssets={logoAssets}
        relatedCards={
          <>
            <RelatedLinksCard
              title={COMPANY_SECTION_TITLES.leads}
              links={[]}
              emptyText={PENDING_TEXT}
            />
            <RelatedLinksCard
              title={COMPANY_SECTION_TITLES.opportunities}
              links={[]}
              emptyText={PENDING_TEXT}
            />
            <PendingRelatedCard
              title={SIGNAL_SECTION_TITLES.signals}
              emptyText={PENDING_TEXT}
              addLabel="Nouveau signal"
            />
          </>
        }
      />
    </AdminFormContent>
  )
}

export default async function NewCompanyPage() {
  await getCurrentUser()

  return (
    <AdminFormPage skeleton={COMPANY_PAGE_SKELETON}>
      <NewCompanySection />
    </AdminFormPage>
  )
}
