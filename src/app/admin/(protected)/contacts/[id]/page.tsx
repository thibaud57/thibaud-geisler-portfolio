import { notFound } from "next/navigation"
import { Suspense } from "react"

import { ContactForm } from "@/components/features/admin/contacts/ContactForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin-routes"
import { CONTACT_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { personDisplayName } from "@/lib/persons"
import { findCompanyOptions } from "@/server/queries/companies"
import { findContactByIdForAdmin } from "@/server/queries/contacts"

async function EditContactSection({ id }: { id: string }) {
  const [contact, companyOptions] = await Promise.all([
    findContactByIdForAdmin(id),
    findCompanyOptions(),
  ])
  if (!contact) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: "Contacts", href: ADMIN_CONTACTS_PATH },
          { label: personDisplayName(contact) },
        ]}
      />
      <ContactForm contact={contact} companyOptions={companyOptions} />
    </div>
  )
}

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={CONTACT_PAGE_SKELETON} />}>
        <EditContactSection id={id} />
      </Suspense>
    </div>
  )
}
