"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { companyLinksLabel } from "@/lib/companies"
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
      trigger={
        <RowActionButton aria-label={`Supprimer ${company.name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={company.name}
      description="Ses signaux sont supprimés avec elle."
      denied={
        links ? `Cette entreprise est rattachée à ${links} et ne peut pas être supprimée.` : null
      }
      successMessage="Entreprise supprimée"
      onDelete={async () => {
        const result = await deleteCompany(company.id)
        if (result.ok) return { ok: true }
        return {
          ok: false,
          denied:
            result.message === "company_in_use"
              ? "Cette entreprise est rattachée à des projets ou des opportunités et ne peut pas être supprimée."
              : null,
        }
      }}
    />
  )
}
