import { Plus } from "lucide-react"

import { DeleteProspectingActionDialog } from "@/components/features/admin/prospection/DeleteProspectingActionDialog"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import { RelatedLinksCard } from "@/components/features/admin/RelatedLinksCard"
import type { RelatedLink } from "@/components/features/admin/RelatedLinksList"
import { Button } from "@/components/ui/button"
import { rankActions } from "@/lib/action-rank"
import { LEAD_SECTION_TITLES } from "@/lib/leads"
import { personDisplayName } from "@/lib/persons"
import { toActionLink } from "@/lib/prospecting-actions"
import type { AdminLead } from "@/server/queries/leads"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface Props {
  lead: AdminLead | null
  actions: readonly AdminProspectingAction[]
}

export function LeadActionsCard({ lead, actions }: Props) {
  // Pas encore de personId tant que le lead n'est pas enregistré : la card reste vide, bouton désactivé.
  if (!lead) {
    return (
      <RelatedLinksCard
        title={LEAD_SECTION_TITLES.actions}
        links={[]}
        emptyText="Après l'enregistrement du lead."
        action={
          <Button type="button" variant="outline" size="sm" disabled>
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle action
          </Button>
        }
      />
    )
  }

  const ranks = rankActions(actions)
  // Depuis la fiche, une action ne peut viser que cette personne (id = personId).
  const personOptions = [
    {
      id: lead.id,
      name: personDisplayName(lead),
      company: lead.company ? { name: lead.company.name } : null,
    },
  ]

  return (
    <RelatedLinksCard
      title={LEAD_SECTION_TITLES.actions}
      links={actions.map((action): RelatedLink => ({
        ...toActionLink(action, ranks.get(action.id) ?? 0),
        actions: (
          <>
            <ProspectingActionFormDialog action={action} personOptions={personOptions} />
            <DeleteProspectingActionDialog action={action} />
          </>
        ),
      }))}
      emptyText="Aucune action pour ce lead."
      action={
        <ProspectingActionFormDialog
          action={null}
          personOptions={personOptions}
          defaultPersonId={lead.id}
          cardTrigger
        />
      }
    />
  )
}
