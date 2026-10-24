import { Suspense } from "react"
import { Plus } from "lucide-react"

import { ProspectingActionFormDialog } from "@/components/features/admin/prospecting-actions/ProspectingActionFormDialog"
import { Button } from "@/components/ui/button"
import type { PersonOption } from "@/server/queries/persons"

interface Props {
  // Promesse plutôt que lecture ici : la page la partage, `cache()` de React étant exclu sur une query Prisma (rule nextjs/data-fetching).
  personOptions: Promise<PersonOption[]>
}

async function NewActionButton({ personOptions }: Props) {
  return <ProspectingActionFormDialog action={null} personOptions={await personOptions} />
}

export function NewActionHeaderButton({ personOptions }: Props) {
  return (
    // Lecture sans cache : sous <Suspense>.
    <Suspense
      fallback={
        <Button disabled>
          <Plus aria-hidden data-icon="inline-start" />
          Nouvelle action
        </Button>
      }
    >
      <NewActionButton personOptions={personOptions} />
    </Suspense>
  )
}
