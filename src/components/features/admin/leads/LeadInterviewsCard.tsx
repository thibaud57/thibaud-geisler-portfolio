import { RelatedCreateCard } from "@/components/features/admin/detail/RelatedCreateCard"
import { ADMIN_INTERVIEWS_PATH } from "@/lib/admin/routes"
import { toLeadInterviewLinks } from "@/lib/crm/interviews"
import { LEAD_SECTION_TITLES } from "@/lib/crm/leads"
import type { AdminLead } from "@/server/queries/leads"

interface Props {
  lead: AdminLead | null
}

export function LeadInterviewsCard({ lead }: Props) {
  return (
    <RelatedCreateCard
      title={LEAD_SECTION_TITLES.interviews}
      record={lead}
      pendingText="Après l'enregistrement du lead."
      emptyText="Aucun entretien pour ce lead."
      links={(record) =>
        toLeadInterviewLinks(record.interviews, (id) => `${ADMIN_INTERVIEWS_PATH}/${id}`)
      }
      createHref={(record) => `${ADMIN_INTERVIEWS_PATH}/nouveau?lead=${record.id}`}
      addLabel="Nouvel entretien"
    />
  )
}
