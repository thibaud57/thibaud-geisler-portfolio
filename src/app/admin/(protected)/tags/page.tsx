import { TagFormDialog } from "@/components/features/admin/tags/TagFormDialog"
import { TagsTable } from "@/components/features/admin/tags/TagsTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { TAG_SKELETON_WIDTHS } from "@/components/features/admin/tags/tag-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { countTagsByKind, findAllTagsForAdmin } from "@/server/queries/tags"

async function TagsList() {
  const tags = await findAllTagsForAdmin()
  return <TagsTable tags={tags} />
}

export default async function AdminTagsPage() {
  // Next rend la page en parallèle de son layout : sans cette garde, son payload RSC part au
  // client même quand celle du layout lève unauthorized()
  await getCurrentUser()

  // 'use cache' (countTagsByKind) : lisible hors <Suspense> sans casser le XOR use-cache/Suspense,
  // et déjà inclus dans le shell statique du segment (loading.tsx) sans saut visuel au chargement.
  const counts = await countTagsByKind()

  return (
    <AdminListPage
      title="Tags"
      subtitle="Contenu bilingue édité depuis une interface française. Un tag rattaché à un projet ne se supprime pas."
      actions={<TagFormDialog tag={null} counts={counts} />}
      skeletonWidths={TAG_SKELETON_WIDTHS}
    >
      <TagsList />
    </AdminListPage>
  )
}
