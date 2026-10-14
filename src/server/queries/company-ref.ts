import "server-only"

import type { Prisma } from "@/generated/prisma/client"

export const companyRefSelect = { id: true, name: true, logoFilename: true } as const

export type CompanyRef = Prisma.CompanyGetPayload<{ select: typeof companyRefSelect }>
