"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
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
      onDelete={async () => {
        const result = await deleteAsset(assetKey)
        if (result.ok) return { ok: true }
        // asset_hardcoded ne vient normalement jamais d'ici (déclencheur disabled), seulement si
        // deleteAsset est appelée autrement que par cet écran.
        if (result.message === "asset_hardcoded") {
          return {
            ok: false,
            denied:
              "Ce fichier est référencé en dur dans le code du site. Il se remplace par un dépôt sur la même clé, il ne se supprime pas ici.",
          }
        }
        if (result.message === "asset_in_use") {
          return { ok: false, denied: formatDenialMessage(result.usedBy ?? []) }
        }
        return { ok: false, denied: null }
      }}
    />
  )
}
