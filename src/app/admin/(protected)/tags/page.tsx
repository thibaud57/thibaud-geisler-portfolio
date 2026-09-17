import { Suspense } from "react"

import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { TagFormDialog } from "@/components/features/admin/tags/TagFormDialog"
import { TagsTable } from "@/components/features/admin/tags/TagsTable"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllTagsForAdmin } from "@/server/queries/tags"

async function TagsList() {
  const tags = await findAllTagsForAdmin()
  return <TagsTable tags={tags} />
}

export default async function AdminTagsPage() {
  // Next rend la page en parallèle de son layout : sans cette garde, son payload RSC part au
  // client même quand celle du layout lève unauthorized()
  await getCurrentUser()

  return (
    <AdminPageShell title="Tags" actions={<TagFormDialog tag={null} />}>
      <Suspense fallback={<DataTableSkeleton />}>
        <TagsList />
      </Suspense>
    </AdminPageShell>
  )
}
