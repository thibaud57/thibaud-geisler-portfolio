import { notFound, redirect } from "next/navigation"

import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { LeadForm } from "@/components/features/admin/leads/LeadForm"
import { LeadInterviewsCard } from "@/components/features/admin/leads/LeadInterviewsCard"
import { LeadOpportunitiesCard } from "@/components/features/admin/leads/LeadOpportunitiesCard"
import { PersonActionsCard } from "@/components/features/admin/persons/PersonActionsCard"
import { SignalsCard } from "@/components/features/admin/signals/SignalsCard"
import { ADMIN_LEADS_PATH } from "@/lib/admin/routes"
import { PERSON_PAGE_SKELETON } from "@/components/features/admin/persons/person-table-widths"
import { personIdSchema, type PersonId } from "@/lib/ids"
import { getCurrentUser } from "@/lib/get-current-user"
import { personDisplayName } from "@/lib/crm/persons"
import { canReceiveSignal } from "@/lib/crm/signals"
import { findCompanyOptions } from "@/server/queries/companies"
import { findLeadByIdForAdmin } from "@/server/queries/leads"
import { findProspectingActionsOfPerson } from "@/server/queries/prospecting-actions"

async function EditLeadSection({ id }: { id: PersonId }) {
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
              actions={actions}
            />
            <LeadOpportunitiesCard lead={lead} />
            <LeadInterviewsCard lead={lead} />
            {/* Seul un lead outbound reçoit un signal ; un lead passé inbound garde les siens. */}
            <SignalsCard
              signals={lead.signals}
              owner={{ kind: "lead", id: lead.id, name: personDisplayName(lead) }}
              canAdd={canReceiveSignal(lead)}
            />
          </>
        }
      />
    </AdminFormContent>
  )
}

export default async function EditLeadPage({ params }: PageProps<"/admin/leads/[id]">) {
  await getCurrentUser()
  const parsedId = personIdSchema.safeParse((await params).id)
  if (!parsedId.success) notFound()

  return (
    <AdminFormPage skeleton={PERSON_PAGE_SKELETON}>
      <EditLeadSection id={parsedId.data} />
    </AdminFormPage>
  )
}
