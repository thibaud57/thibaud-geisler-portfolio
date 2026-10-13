import { ContactForm } from "@/components/features/admin/contacts/ContactForm"
import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin/routes"
import { PERSON_PAGE_SKELETON } from "@/components/features/admin/persons/person-table-widths"
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
      <ContactForm contact={null} companyOptions={companyOptions} leadOptions={leadOptions} />
    </AdminFormContent>
  )
}

export default async function NewContactPage() {
  await getCurrentUser()

  return (
    <AdminFormPage skeleton={PERSON_PAGE_SKELETON}>
      <NewContactSection />
    </AdminFormPage>
  )
}
