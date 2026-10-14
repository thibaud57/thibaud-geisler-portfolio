import { RelatedCreateCard } from "@/components/features/admin/detail/RelatedCreateCard"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin/routes"
import { toOpportunityInterviewLinks } from "@/lib/crm/interviews"
import { OPPORTUNITY_SECTION_TITLES } from "@/lib/crm/opportunities"
import type { AdminOpportunity } from "@/server/queries/opportunities"

interface Props {
  opportunity: AdminOpportunity | null
}

export function OpportunityInterviewsCard({ opportunity }: Props) {
  return (
    <RelatedCreateCard
      title={OPPORTUNITY_SECTION_TITLES.interviews}
      record={opportunity}
      pendingText="Après l'enregistrement de l'opportunité."
      emptyText="Aucun entretien pour cette opportunité."
      links={(record) =>
        toOpportunityInterviewLinks(record.interviews, (id) => `${ADMIN_INTERVIEWS_PATH}/${id}`)
      }
      createHref={(record) => `${ADMIN_INTERVIEWS_PATH}/nouveau?opportunity=${record.id}`}
      addLabel="Nouvel entretien"
    />
  )
}
