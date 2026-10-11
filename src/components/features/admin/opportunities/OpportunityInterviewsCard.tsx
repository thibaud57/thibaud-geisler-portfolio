import { Plus } from "lucide-react"
import Link from "next/link"

import { RelatedLinksCard } from "@/components/features/admin/RelatedLinksCard"
import { Button } from "@/components/ui/button"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin-routes"
import { toOpportunityInterviewLinks } from "@/lib/interviews"
import { OPPORTUNITY_SECTION_TITLES } from "@/lib/opportunities"
import type { AdminOpportunity } from "@/server/queries/opportunities"

interface Props {
  opportunity: AdminOpportunity | null
}

export function OpportunityInterviewsCard({ opportunity }: Props) {
  if (!opportunity) {
    return (
      <RelatedLinksCard
        title={OPPORTUNITY_SECTION_TITLES.interviews}
        links={[]}
        emptyText="Après l'enregistrement de l'opportunité."
        action={
          <Button variant="outline" size="sm" disabled>
            <Plus aria-hidden data-icon="inline-start" />
            Nouvel entretien
          </Button>
        }
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
        <Button variant="outline" size="sm" asChild>
          <Link href={`${ADMIN_INTERVIEWS_PATH}/nouveau?opportunity=${opportunity.id}`}>
            <Plus aria-hidden data-icon="inline-start" />
            Nouvel entretien
          </Link>
        </Button>
      }
    />
  )
}
