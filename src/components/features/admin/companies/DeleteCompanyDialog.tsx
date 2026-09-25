"use client"

import { Trash2 } from "lucide-react"

import { ConfirmDeleteDialog } from "@/components/features/admin/ConfirmDeleteDialog"
import { RowActionButton } from "@/components/features/admin/RowActionButton"
import { deleteCompany } from "@/server/actions/companies"
import type { AdminCompany } from "@/server/queries/companies"

interface Props {
  company: AdminCompany
}

export function DeleteCompanyDialog({ company }: Props) {
  const inUseCount = company._count.clientMetas

  return (
    <ConfirmDeleteDialog
      trigger={
        <RowActionButton aria-label={`Supprimer ${company.name}`}>
          <Trash2 className="size-4" />
        </RowActionButton>
      }
      name={company.name}
      denied={
        inUseCount > 0
          ? `Cette entreprise est rattachée à ${inUseCount} projet${inUseCount > 1 ? "s" : ""} et ne peut pas être supprimée.`
          : null
      }
      successMessage="Entreprise supprimée"
      onDelete={async () => {
        const result = await deleteCompany(company.id)
        if (result.ok) return { ok: true }
        return {
          ok: false,
          denied:
            result.message === "company_in_use"
              ? "Cette entreprise est rattachée à des projets et ne peut pas être supprimée."
              : null,
        }
      }}
    />
  )
}
