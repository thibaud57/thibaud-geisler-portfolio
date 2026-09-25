"use server"

import "server-only"
import { revalidatePath, updateTag } from "next/cache"

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { companySchema, type CompanyInput } from "@/lib/schemas/company"
import { isPrismaError, stringField, stringValues, violatedConstraint } from "@/lib/server-utils"

import { deleteEntity, saveEntity } from "./shared"
import { type CompanyFormState } from "./companies.types"

// Seule source des champs lus depuis le FormData : un champ ajouté ici sans l'être côté validation
// (ou l'inverse) désynchroniserait silencieusement ce qui est validé de ce qui est réaffiché en cas d'échec.
function collectValues(formData: FormData): CompanyFormState["values"] {
  return {
    slug: stringField(formData, "slug"),
    name: stringField(formData, "name"),
    sectors: stringValues(formData, "sectors"),
    size: stringField(formData, "size"),
    websiteUrl: stringField(formData, "websiteUrl"),
    legalEntityId: stringField(formData, "legalEntityId"),
    logoFilename: stringField(formData, "logoFilename"),
  }
}

function mapUniqueViolation(
  err: unknown,
  values: CompanyFormState["values"],
): CompanyFormState | null {
  if (!isPrismaError(err, "P2002")) return null

  if (violatedConstraint(err).includes("legalEntityId")) {
    return {
      ok: false,
      errors: { legalEntityId: ["Cette entité légale est déjà rattachée à une autre entreprise"] },
      message: "legal_entity_taken",
      values,
    }
  }
  return {
    ok: false,
    errors: { slug: ["Ce slug est déjà utilisé par une autre entreprise"] },
    message: "slug_taken",
    values,
  }
}

function invalidateCompanyCaches(): void {
  updateTag("projects")
  revalidatePath("/admin/entreprises")
}

interface SaveCompanyEvents {
  success: string
  failure: string
}

function saveCompany(
  actionName: string,
  events: SaveCompanyEvents,
  formData: FormData,
  persist: (data: CompanyInput) => Promise<unknown>,
): Promise<CompanyFormState> {
  const values = collectValues(formData)

  return saveEntity<CompanyInput, CompanyFormState, unknown>({
    actionName,
    events,
    schema: companySchema,
    input: values,
    persist,
    invalidateCaches: invalidateCompanyCaches,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) => mapUniqueViolation(err, values),
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error", values }),
  })
}

export async function createCompany(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  // Défense en profondeur dans chaque action exportée, hors du try : une Server Action exportée
  // est joignable sans passer par la page, le layout protégé ne couvre que l'affichage.
  await getCurrentUser()

  return saveCompany(
    "createCompany",
    { success: "company:created", failure: "company:create_failed" },
    formData,
    (data) => prisma.company.create({ data }),
  )
}

export async function updateCompany(
  id: string,
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  await getCurrentUser()

  return saveCompany(
    "updateCompany",
    { success: "company:updated", failure: "company:update_failed" },
    formData,
    (data) => prisma.company.update({ where: { id }, data }),
  )
}

export async function deleteCompany(id: string): Promise<CompanyFormState> {
  await getCurrentUser()

  return deleteEntity<CompanyFormState>({
    actionName: "deleteCompany",
    events: { success: "company:deleted", failure: "company:delete_failed" },
    successLogFields: { id },
    destroy: () => prisma.company.delete({ where: { id } }),
    invalidateCaches: invalidateCompanyCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) =>
      isPrismaError(err, "P2003") ? { ok: false, errors: {}, message: "company_in_use" } : null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
