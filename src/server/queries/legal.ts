import 'server-only'
import { cacheLife, cacheTag } from 'next/cache'
import { prisma } from '@/lib/prisma'

const PUBLISHER_SLUG = 'thibaud'

export async function getPublisher() {
  'use cache'
  cacheLife('days')
  cacheTag('legal-entity')
  return prisma.legalEntity.findUniqueOrThrow({
    where: { slug: PUBLISHER_SLUG },
    include: { address: true, publisher: true },
  })
}

export async function getDataProcessors() {
  'use cache'
  cacheLife('days')
  cacheTag('legal-entity')
  const entities = await prisma.legalEntity.findMany({
    where: { processings: { some: {} } },
    include: {
      address: true,
      processings: { orderBy: { displayOrder: 'asc' } },
    },
  })
  return entities
    .flatMap(({ processings, ...entity }) =>
      processings.map((processing) => ({ ...entity, processing })),
    )
    .sort((a, b) => a.processing.displayOrder - b.processing.displayOrder)
}

export async function getHostingProvider() {
  'use cache'
  cacheLife('days')
  cacheTag('legal-entity')
  const processing = await prisma.dataProcessing.findFirstOrThrow({
    where: { kind: 'HOSTING' },
    include: { legalEntity: { include: { address: true } } },
  })
  const { legalEntity, ...processingFields } = processing
  return { ...legalEntity, processing: processingFields }
}
