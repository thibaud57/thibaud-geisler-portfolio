import { notFound } from "next/navigation"

import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { ContactForm } from "@/components/features/admin/contacts/ContactForm"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin/routes"
import { CONTACT_PAGE_SKELETON } from "@/lib/admin/table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { personDisplayName } from "@/lib/crm/persons"
import { findCompanyOptions } from "@/server/queries/companies"
import { findContactByIdForAdmin } from "@/server/queries/contacts"

async function EditContactSection({ id }: { id: string }) {
  const [contact, companyOptions] = await Promise.all([
    findContactByIdForAdmin(id),
    findCompanyOptions(),
  ])
  if (!contact) notFound()

  return (
    <AdminFormContent
      breadcrumb={[
        { label: "Contacts", href: ADMIN_CONTACTS_PATH },
        { label: personDisplayName(contact) },
      ]}
    >
      <ContactForm contact={contact} companyOptions={companyOptions} />
    </AdminFormContent>
  )
}

export default async function EditContactPage({ params }: PageProps<"/admin/contacts/[id]">) {
  await getCurrentUser()
  const { id } = await params

  return (
    <AdminFormPage skeleton={CONTACT_PAGE_SKELETON}>
      <EditContactSection id={id} />
    </AdminFormPage>
  )
}
