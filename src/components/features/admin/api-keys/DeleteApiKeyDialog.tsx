"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { apiKeyDisplayName } from "@/components/features/admin/api-keys/api-key-labels"
import { deleteApiKey } from "@/server/actions/api-keys"
import type { AdminApiKey } from "@/server/queries/api-keys"

interface Props {
  apiKey: AdminApiKey
}

export function DeleteApiKeyDialog({ apiKey }: Props) {
  return (
    <ConfirmDeleteDialog
      name={apiKeyDisplayName(apiKey)}
      description="La clé cesse de fonctionner tout de suite : le client qui s'en sert reçoit une erreur 401. Une nouvelle clé se crée en une minute."
      successMessage="Clé supprimée"
      onDelete={() => deleteApiKey(apiKey.id)}
    />
  )
}
