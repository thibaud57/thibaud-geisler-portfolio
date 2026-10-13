import { PendingRelatedCard } from "@/components/features/admin/detail/PendingRelatedCard"
import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { CreateLinkButton } from "@/components/features/admin/form/CreateLinkButton"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin/routes"
import { toOpportunityInterviewLinks } from "@/lib/crm/interviews"
import { OPPORTUNITY_SECTION_TITLES } from "@/lib/crm/opportunities"
import type { AdminOpportunity } from "@/server/queries/opportunities"

interface Props {
  opportunity: AdminOpportunity | null
}

export function OpportunityInterviewsCard({ opportunity }: Props) {
  if (!opportunity) {
    return (
      <PendingRelatedCard
        title={OPPORTUNITY_SECTION_TITLES.interviews}
        emptyText="Après l'enregistrement de l'opportunité."
        addLabel="Nouvel entretien"
      />
    )
  }

  return (
    <RelatedLinksCard
      title={OPPORTUNITY_SECTION_TITLES.interviews}
      links={toOpportunityInterviewLinks(
        opportunity.interviews,
        (id) => `${ADMIN_INTERVIEWS_PATH}/${id}`,
      )}
      emptyText="Aucun entretien pour cette opportunité."
      action={
        <CreateLinkButton
          href={`${ADMIN_INTERVIEWS_PATH}/nouveau?opportunity=${opportunity.id}`}
          label="Nouvel entretien"
          variant="outline"
          size="sm"
        />
      }
    />
  )
}
