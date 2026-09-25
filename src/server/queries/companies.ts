import "server-only"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

const legalEntitySelect = { legalEntity: { select: { id: true, name: true } } } as const

export type AdminCompany = Prisma.CompanyGetPayload<{
  include: typeof legalEntitySelect & { _count: { select: { clientMetas: true } } }
}>

// Sans 'use cache', comme les tags : l'administration doit lire la base juste après ses propres
// mutations, là où la requête publique servirait un instantané antérieur.
export async function findAllCompaniesForAdmin(): Promise<AdminCompany[]> {
  return prisma.company.findMany({
    include: { ...legalEntitySelect, _count: { select: { clientMetas: true } } },
    orderBy: { name: "asc" },
  })
}

export async function findCompanyByIdForAdmin(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: legalEntitySelect,
  })
}

// Propose les entités libres, plus celle déjà rattachée à l'entreprise en cours d'édition : sans
// cette seconde branche, modifier une entreprise perdrait son entité légale du select.
export async function findAvailableLegalEntities(currentId?: string) {
  return prisma.legalEntity.findMany({
    where: {
      OR: [{ company: null }, ...(currentId ? [{ company: { id: currentId } }] : [])],
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })
}
