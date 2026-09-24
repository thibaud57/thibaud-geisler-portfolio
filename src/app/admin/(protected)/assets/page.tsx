import { Suspense } from "react"

import { AssetsBrowser } from "@/components/features/admin/assets/AssetsBrowser"
import { AssetUploadDialog } from "@/components/features/admin/assets/AssetUploadDialog"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import {
  listAdminAssets,
  listAssets,
  loadAssetReferences,
  matchAssetUsage,
} from "@/server/queries/assets"

async function AssetsSection({ initialSearch }: { initialSearch: string }) {
  const [assets, adminAssets, references] = await Promise.all([
    listAssets(),
    listAdminAssets(),
    loadAssetReferences(),
  ])
  const allAssets = [...assets, ...adminAssets]
  const usage = matchAssetUsage(
    references,
    allAssets.map((asset) => asset.key),
  )

  return (
    <AdminPageShell
      title="Assets"
      subtitle="Objets stockés dans R2, utilisés par le site et l'espace admin. Un asset rattaché ne se supprime pas."
      actions={<AssetUploadDialog existingKeys={allAssets.map((asset) => asset.key)} />}
    >
      <AssetsBrowser assets={allAssets} usage={usage} initialSearch={initialSearch} />
    </AdminPageShell>
  )
}

// `q` : une vue détail y envoie sur un fichier précis (couverture, logo), la recherche déjà posée.
export default async function AdminAssetsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  await getCurrentUser()
  const { q } = await searchParams

  return (
    <Suspense
      fallback={
        <div className="flex w-full flex-col gap-4 px-4 py-6 md:px-6 lg:py-8">
          <StackedSkeleton heights={["h-8", "h-96"]} />
        </div>
      }
    >
      <AssetsSection initialSearch={q ?? ""} />
    </Suspense>
  )
}
