import { CreateLinkButton } from "@/components/features/admin/CreateLinkButton"
import { PendingRelatedCard } from "@/components/features/admin/detail/PendingRelatedCard"
import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin/routes"
import { toLeadInterviewLinks } from "@/lib/crm/interviews"
import { LEAD_SECTION_TITLES } from "@/lib/crm/leads"
import type { AdminLead } from "@/server/queries/leads"

interface Props {
  lead: AdminLead | null
}

export function LeadInterviewsCard({ lead }: Props) {
  if (!lead) {
    return (
      <PendingRelatedCard
        title={LEAD_SECTION_TITLES.interviews}
        emptyText="Après l'enregistrement du lead."
        addLabel="Nouvel entretien"
      />
    )
  }

  return (
    <RelatedLinksCard
      title={LEAD_SECTION_TITLES.interviews}
      links={toLeadInterviewLinks(lead.interviews, (id) => `${ADMIN_INTERVIEWS_PATH}/${id}`)}
      emptyText="Aucun entretien pour ce lead."
      action={
        <CreateLinkButton
          href={`${ADMIN_INTERVIEWS_PATH}/nouveau?lead=${lead.id}`}
          label="Nouvel entretien"
          variant="outline"
          size="sm"
        />
      }
    />
  )
}
