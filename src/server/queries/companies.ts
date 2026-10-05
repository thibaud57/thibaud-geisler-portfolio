import "server-only"

import { prisma } from "@/lib/prisma"
import type { Prisma } from "@/generated/prisma/client"

const legalEntitySelect = { legalEntity: { select: { id: true, name: true } } } as const

const adminCompanyInclude = legalEntitySelect

type AdminCompanyRaw = Prisma.CompanyGetPayload<{
  include: typeof adminCompanyInclude & {
    _count: { select: { clientMetas: true } }
    clientMetas: { select: { project: { select: { type: true } } } }
  }
}>

export type AdminCompany = Omit<AdminCompanyRaw, "clientMetas"> & { worked: boolean }

// Point d'entrée unique des dérivés d'AdminCompany : worked ici, les prochains rejoignent cette même fonction.
function toAdminCompany({ clientMetas, ...company }: AdminCompanyRaw): AdminCompany {
  // Un projet personnel crée aussi un ClientMeta (src/server/actions/projects.ts) : seul un projet CLIENT compte comme travaillée.
  return { ...company, worked: clientMetas.some((meta) => meta.project.type === "CLIENT") }
}

// Sans 'use cache', comme les tags : l'administration doit lire la base juste après ses propres
// mutations, là où la requête publique servirait un instantané antérieur.
export async function findAllCompaniesForAdmin(): Promise<AdminCompany[]> {
  const companies = await prisma.company.findMany({
    include: {
      ...adminCompanyInclude,
      _count: { select: { clientMetas: true } },
      // Chargé seulement pour calculer `worked` dans `toAdminCompany`, jamais renvoyé.
      clientMetas: { select: { project: { select: { type: true } } } },
    },
    orderBy: { name: "asc" },
  })

  return companies.map(toAdminCompany)
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

export type AdminCompanyDetail = NonNullable<Awaited<ReturnType<typeof findCompanyByIdForAdmin>>>
