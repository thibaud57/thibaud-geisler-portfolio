"use server"

import "server-only"
import { revalidatePath, updateTag } from "next/cache"

import type { LegalForm, Prisma } from "@/generated/prisma/client"
import { getCurrentUser } from "@/lib/get-current-user"
import { DEFAULT_CURRENCY, isFrenchCountry } from "@/lib/crm/legal-entities"
import { prisma } from "@/lib/prisma"
import { companySchema, type CompanyInput } from "@/lib/schemas/company"
import {
  isPrismaError,
  optionalStringField,
  stringField,
  stringValues,
  violatedConstraint,
} from "@/lib/server-utils"

import { revalidatePersonLists } from "./_support/person-guards"
import { deleteEntity, saveEntity } from "./_support/shared"
import { type CompanyFormState } from "./companies.types"

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

// Un champ absent du FormData reste undefined : Prisma l'ignore à la mise à jour, donc inchangé.
interface LegalEntityDraft {
  fields: {
    name: string
    legalForm?: LegalForm | null
    siret?: string | null
    vatNumber?: string | null
    rcsCity?: string | null
    rcsNumber?: string | null
    phone?: string | null
    capitalAmount?: number | null
    capitalCurrency?: string | null
  }
  address: { street: string; postalCode: string; city: string; country: string } | null
}

function toLegalEntityDraft(data: CompanyInput): LegalEntityDraft | undefined {
  // Après validation (refineLegalEntity), un nom présent garantit aussi un siège complet : aucun champ rempli n'en tient lieu.
  const name = data.legalEntityName
  if (!name) return undefined

  const address =
    data.legalEntityStreet &&
    data.legalEntityPostalCode &&
    data.legalEntityCity &&
    data.legalEntityCountry
      ? {
          street: data.legalEntityStreet,
          postalCode: data.legalEntityPostalCode,
          city: data.legalEntityCity,
          country: data.legalEntityCountry,
        }
      : null
  const capitalAmount = data.legalEntityCapitalAmount
  const capitalCurrency =
    capitalAmount === undefined
      ? undefined
      : capitalAmount === null
        ? null
        : (data.legalEntityCapitalCurrency ?? DEFAULT_CURRENCY)

  return {
    fields: {
      name,
      legalForm: data.legalEntityStatusKey,
      siret: data.legalEntitySiret,
      vatNumber: data.legalEntityVatNumber,
      rcsCity: data.legalEntityRcsCity,
      rcsNumber: isFrenchCountry(address?.country) ? null : data.legalEntityRcsNumber,
      phone: data.legalEntityPhone,
      capitalAmount,
      capitalCurrency,
    },
    address,
  }
}

function companyFields(data: CompanyInput) {
  return {
    slug: data.slug,
    name: data.name,
    sectors: data.sectors,
    size: data.size,
    websiteUrl: data.websiteUrl,
    logoFilename: data.logoFilename,
    types: data.types,
    relationStatus: data.relationStatus,
    zones: data.zones,
    notes: data.notes,
    details: data.details,
  }
}

function legalEntityCreate(slug: string, legal: LegalEntityDraft) {
  return {
    slug,
    ...legal.fields,
    ...(legal.address ? { address: { create: legal.address } } : {}),
  }
}

function toCreateData(data: CompanyInput): Prisma.CompanyCreateInput {
  const legal = toLegalEntityDraft(data)
  return {
    ...companyFields(data),
    ...(legal ? { legalEntity: { create: legalEntityCreate(data.slug, legal) } } : {}),
  }
}

interface CurrentLegalEntity {
  addressId: string | null
  publisher: { id: string } | null
}

function addressMutation(legal: LegalEntityDraft, current: CurrentLegalEntity | null) {
  if (legal.address) return { upsert: { create: legal.address, update: legal.address } }
  if (current?.addressId) return { delete: true as const }
  return undefined
}

function toUpdateData(
  data: CompanyInput,
  current: CurrentLegalEntity | null,
): Prisma.CompanyUpdateInput {
  const legal = toLegalEntityDraft(data)
  if (!legal) return companyFields(data)

  const address = addressMutation(legal, current)
  // Jamais de Publisher créé ici : seule l'entité de l'éditeur en porte un, posé hors de ce formulaire.
  const publisher = current?.publisher
    ? {
        update: {
          vatRegime: data.legalEntityVatRegime ?? null,
          vatLiableSince: data.legalEntityVatLiableSince ?? null,
        },
      }
    : undefined

  return {
    ...companyFields(data),
    legalEntity: {
      upsert: {
        create: legalEntityCreate(data.slug, legal),
        update: {
          ...legal.fields,
          ...(address ? { address } : {}),
          ...(publisher ? { publisher } : {}),
        },
      },
    },
  }
}

function mapUniqueViolation(
  err: unknown,
  values: CompanyFormState["values"],
): CompanyFormState | null {
  if (!isPrismaError(err, "P2002")) return null

  const constraint = violatedConstraint(err)
  if (constraint.includes("siret")) {
    return {
      ok: false,
      errors: { legalEntitySiret: ["Ce SIRET est déjà porté par une autre entité légale"] },
      message: "siret_taken",
      values,
    }
  }
  if (constraint.includes("LegalEntity_slug")) {
    return {
      ok: false,
      errors: {
        legalEntityName: ["Une entité légale porte déjà l'identifiant de cette entreprise"],
      },
      message: null,
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

// L'entité légale de la société du propriétaire est celle de l'éditeur, lue par les pages légales.
function invalidateCompanyCaches(): void {
  updateTag("projects")
  updateTag("legal-entity")
  revalidatePath("/admin/entreprises")
  // Les listes de leads, de contacts et d'opportunités affichent le nom et le logo de l'entreprise.
  revalidatePersonLists()
}

const companyExists = (id: string) =>
  prisma.company.count({ where: { id } }).then((count) => count > 0)

interface SaveCompanyEvents {
  success: string
  failure: string
}

function saveCompany(
  actionName: string,
  events: SaveCompanyEvents,
  formData: FormData,
  persist: (data: CompanyInput) => Promise<unknown>,
  updatedId?: string,
): Promise<CompanyFormState> {
  const values = collectValues(formData)

  return saveEntity<CompanyInput, CompanyFormState, unknown>({
    actionName,
    events,
    schema: companySchema,
    input: values,
    persist,
    successLogFields: (data) => ({ slug: data.slug }),
    invalidateCaches: invalidateCompanyCaches,
    onValidationError: (fieldErrors) => ({ ok: false, errors: fieldErrors, message: null, values }),
    onSuccess: () => ({ ok: true, errors: {}, message: null }),
    notFound:
      updatedId === undefined
        ? undefined
        : {
            exists: () => companyExists(updatedId),
            state: () => ({ ok: false, errors: {}, message: "company_not_found", values }),
          },
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
    (data) => prisma.company.create({ data: toCreateData(data) }),
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
    (data) =>
      prisma.$transaction(async (tx) => {
        const current = data.legalEntityName
          ? await tx.company.findUnique({
              where: { id },
              select: {
                legalEntity: { select: { addressId: true, publisher: { select: { id: true } } } },
              },
            })
          : null
        return tx.company.update({
          where: { id },
          data: toUpdateData(data, current?.legalEntity ?? null),
        })
      }),
    id,
  )
}

export async function deleteCompany(id: string): Promise<CompanyFormState> {
  await getCurrentUser()

  return deleteEntity<CompanyFormState>({
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
