import { ContactsTable } from "@/components/features/admin/contacts/ContactsTable"
import { AdminListPage } from "@/components/layout/admin/AdminListPage"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin/routes"
import { firstParam } from "@/lib/admin/search-params"
import { contactSkeletonWidths } from "@/components/features/admin/contacts/contact-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllContactsForAdmin } from "@/server/queries/contacts"

async function ContactsSection({ initialDetailId }: { initialDetailId?: string }) {
  const contacts = await findAllContactsForAdmin()
  return <ContactsTable contacts={contacts} initialDetailId={initialDetailId} />
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
