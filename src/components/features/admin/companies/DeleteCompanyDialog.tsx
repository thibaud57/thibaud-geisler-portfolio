"use client"

import { ConfirmDeleteDialog } from "@/components/features/admin/form/ConfirmDeleteDialog"
import { companyLinksLabel } from "@/lib/crm/companies"
import { deleteCompany } from "@/server/actions/companies"
import type { AdminCompany } from "@/server/queries/companies"

interface Props {
  company: AdminCompany
}

export function DeleteCompanyDialog({ company }: Props) {
  const opportunityCount =
    company._count.opportunitiesAsIntermediary + company._count.opportunitiesAsClient
  const links = companyLinksLabel(company._count.clientMetas, opportunityCount)

  return (
    <ConfirmDeleteDialog
      name={company.name}
      description="Ses signaux sont supprimés avec elle."
      denied={
        links ? `Cette entreprise est rattachée à ${links} et ne peut pas être supprimée.` : null
      }
      successMessage="Entreprise supprimée"
      onDelete={() => deleteCompany(company.id)}
      denials={{
        company_in_use:
          "Cette entreprise est rattachée à des projets ou des opportunités et ne peut pas être supprimée.",
      }}
    />
  )
}
