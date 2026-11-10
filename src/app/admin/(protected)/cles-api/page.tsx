import { ApiKeyFormDialog } from "@/components/features/admin/api-keys/ApiKeyFormDialog"
import { ApiKeysTable } from "@/components/features/admin/api-keys/ApiKeysTable"
import { API_KEY_SKELETON_WIDTHS } from "@/components/features/admin/api-keys/api-key-table-widths"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { getCurrentUser } from "@/lib/get-current-user"
import { findApiKeysForAdmin } from "@/server/queries/api-keys"

async function ApiKeysList() {
  const apiKeys = await findApiKeysForAdmin()
  return <ApiKeysTable apiKeys={apiKeys} />
}

export default async function AdminApiKeysPage() {
  // Next rend la page en parallèle de son layout : sans cette garde, son payload RSC de la page part
  // au client même quand celle du layout lève unauthorized()
  await getCurrentUser()

  return (
    <AdminListPage
      title="Clés d'API"
      subtitle="Une clé par usage, limitée à ses domaines. Sa valeur ne s'affiche qu'à la création."
      skeletonWidths={API_KEY_SKELETON_WIDTHS}
      actions={<ApiKeyFormDialog />}
    >
      <ApiKeysList />
    </AdminListPage>
  )
}
