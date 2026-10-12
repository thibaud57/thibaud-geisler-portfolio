import { notFound } from "next/navigation"

import { AdminFormContent, AdminFormPage } from "@/components/layout/admin/AdminFormPage"
import { ContactForm } from "@/components/features/admin/contacts/ContactForm"
import { PersonActionsCard } from "@/components/features/admin/persons/PersonActionsCard"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin/routes"
import { CONTACT_PAGE_SKELETON } from "@/lib/admin/table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { personDisplayName } from "@/lib/crm/persons"
import { findCompanyOptions } from "@/server/queries/companies"
import { findContactByIdForAdmin } from "@/server/queries/contacts"
import { findProspectingActionsOfPerson } from "@/server/queries/prospecting-actions"

async function EditContactSection({ id }: { id: string }) {
  const [contact, companyOptions, actions] = await Promise.all([
    findContactByIdForAdmin(id),
    findCompanyOptions(),
    findProspectingActionsOfPerson(id),
  ])
  if (!contact) notFound()

  return (
    <AdminFormContent
      breadcrumb={[
        { label: "Contacts", href: ADMIN_CONTACTS_PATH },
        { label: personDisplayName(contact) },
      ]}
    >
      <ContactForm
        contact={contact}
        companyOptions={companyOptions}
        relatedCards={
          // Sans clé, React avertit d'un enfant de liste sans key en navigation client (élément venu du serveur).
          <PersonActionsCard
            key="actions"
            person={{ id: contact.id, name: personDisplayName(contact), company: contact.company }}
            role="contact"
            actions={actions}
          />
        }
      />
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
