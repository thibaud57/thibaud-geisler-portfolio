import { ContactsTable } from "@/components/features/admin/contacts/ContactsTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin/routes"
import { firstParam } from "@/lib/admin/search-params"
import { contactSkeletonWidths } from "@/lib/admin/table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllContactsForAdmin } from "@/server/queries/contacts"
import { findActionTimelinesForAdmin } from "@/server/queries/prospecting-actions"

async function ContactsSection({ initialDetailId }: { initialDetailId?: string }) {
  const [contacts, actions] = await Promise.all([
    findAllContactsForAdmin(),
    findActionTimelinesForAdmin({ role: "contact" }),
  ])
  return <ContactsTable contacts={contacts} actions={actions} initialDetailId={initialDetailId} />
}

export default async function AdminContactsPage({ searchParams }: PageProps<"/admin/contacts">) {
  await getCurrentUser()
  const { detail } = await searchParams

  return (
    <AdminListPage
      title="Contacts"
      subtitle="Réseau professionnel durable, indépendant du pipeline commercial. Une fiche peut aussi porter le rôle Lead."
      create={{ href: `${ADMIN_CONTACTS_PATH}/nouveau`, label: "Nouveau contact" }}
      skeletonWidths={contactSkeletonWidths()}
    >
      <ContactsSection initialDetailId={firstParam(detail)} />
    </AdminListPage>
  )
}
