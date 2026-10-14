"use client"

import { PendingRelatedCard } from "@/components/features/admin/detail/PendingRelatedCard"
import { RelatedLinksCard } from "@/components/features/admin/detail/RelatedLinksCard"
import { ActionRowActions } from "@/components/features/admin/prospecting-actions/ActionRowActions"
import { ProspectingActionFormDialog } from "@/components/features/admin/prospecting-actions/ProspectingActionFormDialog"
import { useProspectingActionDetail } from "@/components/features/admin/prospecting-actions/use-prospecting-action-detail"
import { PERSON_SECTION_TITLES } from "@/lib/crm/persons"
import { toActionLink } from "@/lib/crm/prospecting-actions"
import type { AdminProspectingAction } from "@/server/queries/prospecting-actions"

interface ActionsOwner {
  id: string
  name: string
  company: { name: string } | null
}

interface Props {
  person: ActionsOwner | null
  actions: readonly AdminProspectingAction[]
}

export function PersonActionsCard({ person, actions }: Props) {
  // Pas encore de personId tant que la fiche n'est pas enregistrée.
  if (!person) {
    return (
      <PendingRelatedCard
        title={PERSON_SECTION_TITLES.actions}
        emptyText="Après l'enregistrement du lead."
        addLabel="Nouvelle action"
      />
    )
  }

  return <SavedPersonActionsCard person={person} actions={actions} />
}

function SavedPersonActionsCard({
  person,
  actions,
}: {
  person: ActionsOwner
  actions: readonly AdminProspectingAction[]
}) {
  // Depuis la fiche, une action ne peut viser que cette personne (id = personId).
  const personOptions = [
    {
      id: person.id,
      name: person.name,
      company: person.company ? { name: person.company.name } : null,
    },
  ]
  const { openDetail, dialogs } = useProspectingActionDetail({ actions, personOptions })

  return (
    <>
      <RelatedLinksCard
        title={PERSON_SECTION_TITLES.actions}
        links={actions.map((action) => ({
          ...toActionLink(action),
          onClick: () => {
            openDetail(action)
          },
          actions: <ActionRowActions action={action} personOptions={personOptions} />,
        }))}
        emptyText="Aucune action pour ce lead."
        action={
          <ProspectingActionFormDialog
            action={null}
            personOptions={personOptions}
            defaultPersonId={person.id}
            cardTrigger
          />
        }
      />
      {dialogs}
    </>
  )
}
