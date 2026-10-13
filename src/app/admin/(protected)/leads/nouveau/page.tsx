import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { LeadForm } from "@/components/features/admin/leads/LeadForm"
import { LeadInterviewsCard } from "@/components/features/admin/leads/LeadInterviewsCard"
import { LeadOpportunitiesCard } from "@/components/features/admin/leads/LeadOpportunitiesCard"
import { PendingRelatedCard } from "@/components/features/admin/detail/PendingRelatedCard"
import { PersonActionsCard } from "@/components/features/admin/persons/PersonActionsCard"
import { ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import { LEAD_PAGE_SKELETON } from "@/lib/admin/table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"

async function NewLeadSection() {
  const companyOptions = await findCompanyOptions()

  return (
    <AdminFormContent
      breadcrumb={[{ label: "Leads", href: ADMIN_LEADS_PATH }, { label: "Nouveau lead" }]}
    >
      <LeadForm
        lead={null}
        companyOptions={companyOptions}
        relatedCards={
          <>
            <PersonActionsCard person={null} actions={[]} />
            <LeadOpportunitiesCard lead={null} />
            <LeadInterviewsCard lead={null} />
            <PendingRelatedCard
              title="Signaux"
              emptyText="Après l'enregistrement du lead."
              addLabel="Nouveau signal"
            />
          </>
        }
      />
    </AdminFormContent>
  )
}

export default async function NewLeadPage() {
  await getCurrentUser()

  return (
    <AdminFormPage skeleton={LEAD_PAGE_SKELETON}>
      <NewLeadSection />
    </AdminFormPage>
  )
}
