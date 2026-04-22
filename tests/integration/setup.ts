import { config } from 'dotenv'
import path from 'node:path'

config({ path: path.resolve(process.cwd(), '.env.test'), override: true })

import { prisma } from '@/lib/prisma'

export async function resetDatabase(): Promise<void> {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Project", "ClientMeta", "Company", "Tag", "ProjectTag" RESTART IDENTITY CASCADE',
  )
}

export { prisma }
