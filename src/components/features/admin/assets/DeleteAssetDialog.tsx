"use client"

import { Trash2 } from "lucide-react"

import { assertNever } from "@/lib/assert-never"
import type { DeleteOutcome } from "@/lib/admin/delete-outcome"
import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/table/RowActionButton"
import { nameOfAssetKey } from "@/lib/assets"
import { isHardcodedAssetKey } from "@/lib/asset-keys"
import { deleteAsset } from "@/server/actions/assets"

interface Props {
  assetKey: string
  usedBy: readonly string[]
}

// Un seul gabarit, quel que soit le nombre de rattachements : deleteAsset ne dit pas leur nature
// (couverture, logo, case study), seulement leurs slugs.
function formatDenialMessage(usedBy: readonly string[]): string {
  const names = usedBy.map((slug) => `« ${slug} »`)
  const joined = new Intl.ListFormat("fr", { style: "long", type: "conjunction" }).format(names)
  const rattachement = usedBy.length > 1 ? "les rattachements" : "le rattachement"
  return `Ce fichier est utilisé par ${joined}. Retirez ${rattachement} avant de le supprimer.`
}

const HARDCODED_DENIAL =
  "Ce fichier est référencé en dur dans le code du site. Il se remplace par un dépôt sur la même clé, il ne se supprime pas ici."

export function DeleteAssetDialog({ assetKey, usedBy }: Props) {
  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton
          aria-label={`Supprimer ${assetKey}`}
          disabled={isHardcodedAssetKey(assetKey)}
        >
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={nameOfAssetKey(assetKey)}
      denied={usedBy.length > 0 ? formatDenialMessage(usedBy) : null}
      successMessage="Fichier supprimé"
      onDelete={async (): Promise<DeleteOutcome> => {
        const result = await deleteAsset(assetKey)
        if (result.ok) return { status: "deleted" }
        switch (result.message) {
          // asset_hardcoded ne vient normalement jamais d'ici (déclencheur disabled), seulement si
          // deleteAsset est appelée autrement que par cet écran.
          case "asset_hardcoded":
            return { status: "denied", reason: HARDCODED_DENIAL }
          case "asset_in_use":
            return { status: "denied", reason: formatDenialMessage(result.usedBy) }
          case "invalid_path":
          case "unknown_error":
            return { status: "failed" }
          default:
            return assertNever(result)
        }
      }}
    />
  )
}
