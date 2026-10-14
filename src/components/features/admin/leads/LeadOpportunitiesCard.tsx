import { RelatedCreateCard } from "@/components/features/admin/detail/RelatedCreateCard"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import { LEAD_SECTION_TITLES } from "@/lib/crm/leads"
import { toOpportunityLink } from "@/lib/crm/opportunities"
import type { AdminLead } from "@/server/queries/leads"

interface Props {
  lead: AdminLead | null
}

export function LeadOpportunitiesCard({ lead }: Props) {
  return (
    <RelatedCreateCard
      title={LEAD_SECTION_TITLES.opportunities}
      record={lead}
      pendingText="Après l'enregistrement du lead."
      emptyText="Aucune opportunité apportée par ce lead."
      links={(record) =>
        record.opportunities.map((opportunity) =>
          toOpportunityLink(opportunity, {
            href: `${ADMIN_OPPORTUNITIES_PATH}/${opportunity.id}`,
            metaSuffix: opportunity.client?.name,
          }),
        )
      }
      createHref={(record) => `${ADMIN_OPPORTUNITIES_PATH}/nouvelle?referrer=${record.id}`}
      addLabel="Nouvelle opportunité"
    />
  )
}
