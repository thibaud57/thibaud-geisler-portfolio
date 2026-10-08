import { Suspense } from "react"
import { Plus } from "lucide-react"

import { ProspectingActionFormDialog } from "@/components/features/admin/prospection/ProspectingActionFormDialog"
import { Button } from "@/components/ui/button"
import { findPersonOptions } from "@/server/queries/persons"

async function NewActionButton() {
  const personOptions = await findPersonOptions()
  return <ProspectingActionFormDialog action={null} personOptions={personOptions} />
}

export function NewActionHeaderButton() {
  return (
    // Le bouton lit les personnes sans cache : sous <Suspense>, comme la table.
    <Suspense
      fallback={
        <Button disabled>
          <Plus aria-hidden data-icon="inline-start" />
          Nouvelle action
        </Button>
      }
    >
      <NewActionButton />
    </Suspense>
  )
}
