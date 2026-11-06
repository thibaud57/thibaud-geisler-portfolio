"use server"

import "server-only"
import { updateTag } from "next/cache"

import { assertNever } from "@/lib/assert-never"
import { getCurrentUser } from "@/lib/get-current-user"
import { companyIdSchema } from "@/lib/ids"
import { prisma } from "@/lib/prisma"
import { companySchema, type CompanyInput } from "@/lib/schemas/company"
import { isPrismaError, optionalStringField, stringField, stringValues } from "@/lib/server-utils"
import {
  COMPANY_CACHE_TAGS,
  createCompany as createCompanyRecord,
  updateCompany as updateCompanyRecord,
  type CompanyFieldsError,
  type CompanySummary,
} from "@/server/crm/companies"
import { fail, type DomainResult } from "@/server/crm/result"

import { revalidatePersonLists } from "./_support/person-guards"
import {
  deleteEntity,
  formStateHandlers,
  rowExists,
  saveEntity,
  type ActionEvents,
} from "./_support/shared"
import { type CompanyDeleteState, type CompanyFormState } from "./companies.types"

// Seule source des champs lus depuis le FormData : désynchronisé du schéma de validation, un échec réafficherait les mauvaises valeurs.
function collectValues(formData: FormData): CompanyFormState["values"] {
  return {
    slug: stringField(formData, "slug"),
    name: stringField(formData, "name"),
    sectors: stringValues(formData, "sectors"),
    size: stringField(formData, "size"),
    websiteUrl: stringField(formData, "websiteUrl"),
    logoFilename: stringField(formData, "logoFilename"),
    types: stringValues(formData, "types"),
    relationStatus: optionalStringField(formData, "relationStatus"),
    zones: stringValues(formData, "zones"),
    notes: optionalStringField(formData, "notes"),
    details: optionalStringField(formData, "details"),
    legalEntityName: optionalStringField(formData, "legalEntityName"),
    legalEntityStatusKey: optionalStringField(formData, "legalEntityStatusKey"),
    legalEntitySiret: optionalStringField(formData, "legalEntitySiret"),
    legalEntityVatNumber: optionalStringField(formData, "legalEntityVatNumber"),
    legalEntityRcsCity: optionalStringField(formData, "legalEntityRcsCity"),
    legalEntityRcsNumber: optionalStringField(formData, "legalEntityRcsNumber"),
    legalEntityPhone: optionalStringField(formData, "legalEntityPhone"),
    legalEntityCapitalAmount: optionalStringField(formData, "legalEntityCapitalAmount"),
    legalEntityCapitalCurrency: optionalStringField(formData, "legalEntityCapitalCurrency"),
    legalEntityStreet: optionalStringField(formData, "legalEntityStreet"),
    legalEntityPostalCode: optionalStringField(formData, "legalEntityPostalCode"),
    legalEntityCity: optionalStringField(formData, "legalEntityCity"),
    legalEntityCountry: optionalStringField(formData, "legalEntityCountry"),
    legalEntityVatLiableSince: optionalStringField(formData, "legalEntityVatLiableSince"),
    legalEntityVatRegime: optionalStringField(formData, "legalEntityVatRegime"),
  }
}

function domainError(
  values: CompanyFormState["values"],
  errors: Extract<CompanyFormState, { ok: false }>["errors"],
  message: Extract<CompanyFormState, { ok: false }>["message"],
  invalidate = false,
): { state: CompanyFormState; invalidate: boolean } {
  return { state: { ok: false, errors, message, values }, invalidate }
}

function mapDomainError(
  error: CompanyFieldsError,
  values: CompanyFormState["values"],
): { state: CompanyFormState; invalidate: boolean } {
  switch (error.code) {
    case "slug_taken":
      return domainError(
        values,
        { slug: ["Ce slug est déjà utilisé par une autre entreprise"] },
        "slug_taken",
      )
    case "siret_taken":
      return domainError(
        values,
        { legalEntitySiret: ["Ce SIRET est déjà porté par une autre entité légale"] },
        "siret_taken",
      )
    case "legal_entity_slug_taken":
      return domainError(
        values,
        { legalEntityName: ["Une entité légale porte déjà l'identifiant de cette entreprise"] },
        null,
      )
    case "not_found":
      return domainError(values, {}, "company_not_found", true)
    default:
      return assertNever(error)
  }
}

// L'entité légale de la société du propriétaire est celle de l'éditeur, lue par les pages légales.
function invalidateCompanyCaches(): void {
  for (const tag of COMPANY_CACHE_TAGS) updateTag(tag)
  // Outre la liste des entreprises, les leads, contacts et opportunités affichent son nom et son logo.
  revalidatePersonLists()
}

const companyExists = (id: string) => rowExists(prisma.company, { id })

function saveCompany(
  actionName: string,
  events: ActionEvents,
  formData: FormData,
  persist: (data: CompanyInput) => Promise<DomainResult<CompanySummary, CompanyFieldsError>>,
): Promise<CompanyFormState> {
  const values = collectValues(formData)

  return saveEntity<CompanyInput, CompanyFormState, CompanySummary, CompanyFieldsError>({
    actionName,
    events,
    schema: companySchema,
    input: values,
    persist,
    successLogFields: (data) => ({ slug: data.slug }),
    invalidateCaches: invalidateCompanyCaches,
    onDomainError: (error) => mapDomainError(error, values),
    ...formStateHandlers(values),
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
    createCompanyRecord,
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
    async (data) => {
      // Un id invalide ne désigne aucune fiche : même réponse qu'une entreprise supprimée, sous l'instrumentation de l'action.
      const parsedId = companyIdSchema.safeParse(id)
      return parsedId.success
        ? updateCompanyRecord(parsedId.data, { kind: "fields", fields: data })
        : fail({ code: "not_found" })
    },
  )
}

export async function deleteCompany(id: string): Promise<CompanyDeleteState> {
  await getCurrentUser()

  return deleteEntity<CompanyDeleteState>({
    actionName: "deleteCompany",
    events: { success: "company:deleted", failure: "company:delete_failed" },
    successLogFields: { id },
    exists: () => companyExists(id),
    // L'entité part avec l'entreprise, sauf si elle sert aux pages légales (éditeur, sous-traitant) : sa suppression les emporterait par cascade.
    destroy: () =>
      prisma.$transaction(async (tx) => {
        const company = await tx.company.findUnique({
          where: { id },
          select: {
            legalEntity: {
              select: {
                id: true,
                addressId: true,
                publisher: { select: { id: true } },
                _count: { select: { processings: true } },
              },
            },
          },
        })
        await tx.company.delete({ where: { id } })

        const entity = company?.legalEntity
        if (entity && !entity.publisher && entity._count.processings === 0) {
          await tx.legalEntity.delete({ where: { id: entity.id } })
          if (entity.addressId) await tx.address.delete({ where: { id: entity.addressId } })
        }
      }),
    invalidateCaches: invalidateCompanyCaches,
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    mapError: (err) =>
      isPrismaError(err, "P2003") ? { ok: false, errors: {}, message: "company_in_use" } : null,
    onUnknownError: () => ({ ok: false, errors: {}, message: "unknown_error" }),
  })
}
