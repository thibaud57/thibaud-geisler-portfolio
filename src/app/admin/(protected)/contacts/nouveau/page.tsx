import { Suspense } from "react"

import { ContactForm } from "@/components/features/admin/contacts/ContactForm"
import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { ADMIN_CONTACTS_PATH } from "@/lib/admin-routes"
import { CONTACT_PAGE_SKELETON } from "@/lib/admin-table-widths"
import { getCurrentUser } from "@/lib/get-current-user"
import { findCompanyOptions } from "@/server/queries/companies"
import { findLeadsWithoutContactRole } from "@/server/queries/persons"

async function NewContactSection() {
  const [companyOptions, leadOptions] = await Promise.all([
    findCompanyOptions(),
    findLeadsWithoutContactRole(),
  ])

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[{ label: "Contacts", href: ADMIN_CONTACTS_PATH }, { label: "Nouveau contact" }]}
      />
      <ContactForm contact={null} companyOptions={companyOptions} leadOptions={leadOptions} />
    </div>
  )
}

export default async function NewContactPage() {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={CONTACT_PAGE_SKELETON} />}>
        <NewContactSection />
      </Suspense>
    </div>
  )
}
