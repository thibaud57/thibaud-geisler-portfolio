"use server"

import "server-only"
import { revalidatePath, updateTag } from "next/cache"
import { z } from "zod"

import { getCurrentUser } from "@/lib/get-current-user"
import { prisma } from "@/lib/prisma"
import { companySchema, type CompanyInput } from "@/lib/schemas/company"
import { createActionLogger, isPrismaError, stringField } from "@/lib/server-utils"

import { type CompanyFormState } from "./companies.types"

// Prisma 7 + @prisma/adapter-pg ne porte pas `meta.target` sur un P2002 : l'index de contrainte
// vit sous `meta.driverAdapterError.cause.constraint.index` (nom Postgres `<Table>_<col>_key`),
// constaté sur ce projet le 2026-09-19. `meta.target` reste un filet pour un autre chemin d'erreur.
function uniqueConstraintIndex(err: unknown): string {
  if (typeof err !== "object" || err === null) return ""
  const meta = (err as { meta?: unknown }).meta
  if (typeof meta !== "object" || meta === null) return ""

  const driverIndex = (
    meta as { driverAdapterError?: { cause?: { constraint?: { index?: unknown } } } }
  ).driverAdapterError?.cause?.constraint?.index
  if (typeof driverIndex === "string") return driverIndex

  const target = (meta as { target?: unknown }).target
  if (Array.isArray(target)) return target.join(",")
  return typeof target === "string" ? target : ""
}

// getAll, jamais get : un FormData renvoyant plusieurs valeurs pour "sectors", get() ne garderait
// que la première et silencierait la perte des autres secteurs cochés.
function stringValues(formData: FormData, key: string): string[] {
  return formData.getAll(key).filter((value): value is string => typeof value === "string")
}

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

  if (uniqueConstraintIndex(err).includes("legalEntityId")) {
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

async function saveCompany(
  actionName: string,
  events: SaveCompanyEvents,
  formData: FormData,
  persist: (data: CompanyInput) => Promise<unknown>,
): Promise<CompanyFormState> {
  const { log } = await createActionLogger(actionName)
  const values = collectValues(formData)

  const result = companySchema.safeParse(values)
  if (!result.success) {
    return { ok: false, errors: z.flattenError(result.error).fieldErrors, message: null, values }
  }

  try {
    await persist(result.data)
    // Après l'écriture réussie seulement : une invalidation précédant un échec purgerait le cache sans raison.
    invalidateCompanyCaches()
    log.info({ event: events.success, slug: result.data.slug })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    const mapped = mapUniqueViolation(err, values)
    if (mapped) return mapped

    log.error({ err, event: events.failure })
    return { ok: false, errors: {}, message: "unknown_error", values }
  }
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

  const { log } = await createActionLogger("deleteCompany")

  try {
    await prisma.company.delete({ where: { id } })
    invalidateCompanyCaches()
    log.info({ event: "company:deleted", id })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    if (isPrismaError(err, "P2003")) {
      return { ok: false, errors: {}, message: "company_in_use" }
    }
    log.error({ err, event: "company:delete_failed" })
    return { ok: false, errors: {}, message: "unknown_error" }
  }
}
