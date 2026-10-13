import { CreateLinkButton } from "@/components/features/admin/form/CreateLinkButton"
import { PendingRelatedCard } from "@/components/features/admin/detail/PendingRelatedCard"
import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { ADMIN_OPPORTUNITIES_PATH } from "@/lib/admin/routes"
import { LEAD_SECTION_TITLES } from "@/lib/crm/leads"
import { toOpportunityLink } from "@/lib/crm/opportunities"
import type { AdminLead } from "@/server/queries/leads"

interface Props {
  lead: AdminLead | null
}

export function LeadOpportunitiesCard({ lead }: Props) {
  if (!lead) {
    return (
      <PendingRelatedCard
        title={LEAD_SECTION_TITLES.opportunities}
        emptyText="Après l'enregistrement du lead."
        addLabel="Nouvelle opportunité"
      />
    )
  }

  return (
    <RelatedLinksCard
      title={LEAD_SECTION_TITLES.opportunities}
      links={lead.opportunities.map((opportunity) =>
        toOpportunityLink(opportunity, {
          href: `${ADMIN_OPPORTUNITIES_PATH}/${opportunity.id}`,
          metaSuffix: opportunity.client?.name,
        }),
      )}
      emptyText="Aucune opportunité apportée par ce lead."
      action={
        <CreateLinkButton
          href={`${ADMIN_OPPORTUNITIES_PATH}/nouvelle?referrer=${lead.id}`}
          label="Nouvelle opportunité"
          variant="outline"
          size="sm"
        />
      }
    />
  )
}
