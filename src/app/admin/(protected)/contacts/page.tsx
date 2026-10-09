import { Suspense } from "react"
import { Plus } from "lucide-react"
import Link from "next/link"

import { ContactsTable } from "@/components/features/admin/contacts/ContactsTable"
import { DataTableSkeleton } from "@/components/features/admin/DataTableSkeleton"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin-routes"
import { contactSkeletonWidths } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllContactsForAdmin } from "@/server/queries/contacts"

interface Props {
  searchParams: Promise<{ detail?: string }>
}

async function ContactsSection({ initialDetailId }: { initialDetailId?: string }) {
  const contacts = await findAllContactsForAdmin()
  return <ContactsTable contacts={contacts} initialDetailId={initialDetailId} />
}

export default async function AdminContactsPage({ searchParams }: Props) {
  await getCurrentUser()
  const { detail } = await searchParams

  return (
    <AdminPageShell
      title="Contacts & relations"
      subtitle="Réseau professionnel durable, indépendant du pipeline commercial. Une fiche peut aussi porter le rôle Lead."
      actions={
        <Button asChild>
          <Link href={`${ADMIN_CONTACTS_PATH}/nouveau`}>
            <Plus aria-hidden data-icon="inline-start" />
            Nouveau contact
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<DataTableSkeleton columnWidths={contactSkeletonWidths()} />}>
        <ContactsSection initialDetailId={detail} />
      </Suspense>
    </AdminPageShell>
  )
}
