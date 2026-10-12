import { ContactForm } from "@/components/features/admin/contacts/ContactForm"
import { PersonActionsCard } from "@/components/features/admin/persons/PersonActionsCard"
import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin/routes"
import { CONTACT_PAGE_SKELETON } from "@/lib/admin/table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findLeadsWithoutContactRole } from "@/server/queries/persons"

async function NewContactSection() {
  const [companyOptions, leadOptions] = await Promise.all([
    findCompanyOptions(),
    findLeadsWithoutContactRole(),
  ])

  return (
    <AdminFormContent
      breadcrumb={[{ label: "Contacts", href: ADMIN_CONTACTS_PATH }, { label: "Nouveau contact" }]}
    >
      <ContactForm
        contact={null}
        companyOptions={companyOptions}
        leadOptions={leadOptions}
        relatedCards={<PersonActionsCard person={null} role="contact" actions={[]} />}
      />
    </AdminFormContent>
  )
}

export default async function NewContactPage() {
  await getCurrentUser()

  return (
    <AdminFormPage skeleton={CONTACT_PAGE_SKELETON}>
      <NewContactSection />
    </AdminFormPage>
  )
}
