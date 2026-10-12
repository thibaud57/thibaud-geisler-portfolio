import { notFound, redirect } from "next/navigation"

import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { LeadForm } from "@/components/features/admin/leads/LeadForm"
import { LeadOpportunitiesCard } from "@/components/features/admin/leads/LeadOpportunitiesCard"
import { PersonActionsCard } from "@/components/features/admin/persons/PersonActionsCard"
import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { SignalsCard } from "@/components/features/admin/signals/SignalsCard"
import { ADMIN_INTERVIEWS_PATH, ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import { LEAD_PAGE_SKELETON } from "@/lib/admin/table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { toLeadInterviewLinks } from "@/lib/crm/interviews"
import { LEAD_SECTION_TITLES } from "@/lib/crm/leads"
import { personDisplayName } from "@/lib/crm/persons"
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
    <AdminFormContent
      breadcrumb={[{ label: "Leads", href: ADMIN_LEADS_PATH }, { label: personDisplayName(lead) }]}
    >
      <LeadForm
        lead={lead}
        companyOptions={companyOptions}
        relatedCards={
          <>
            <PersonActionsCard
              person={{ id: lead.id, name: personDisplayName(lead), company: lead.company }}
              role="lead"
              actions={actions}
            />
            <LeadOpportunitiesCard lead={lead} />
            <RelatedLinksCard
              title={LEAD_SECTION_TITLES.interviews}
              links={toLeadInterviewLinks(
                lead.interviews,
                (id) => `${ADMIN_INTERVIEWS_PATH}/${id}`,
              )}
              emptyText="Aucun entretien pour ce lead."
            />
            {/* Seul un lead outbound reçoit un signal ; un lead passé inbound garde les siens. */}
            <SignalsCard
              signals={lead.signals}
              owner={{ kind: "lead", id: lead.id, name: personDisplayName(lead) }}
              canAdd={lead.origin === "OUTBOUND"}
            />
          </>
        }
      />
    </AdminFormContent>
  )
}

export default async function EditLeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  await getCurrentUser()
  const { id } = await params

  return (
    <AdminFormPage skeleton={LEAD_PAGE_SKELETON}>
      <EditLeadSection id={id} />
    </AdminFormPage>
  )
}
