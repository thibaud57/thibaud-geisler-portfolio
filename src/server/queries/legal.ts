import "server-only"
import { cacheLife, cacheTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { RetentionPolicyKey } from "@/lib/schemas/legal-keys"

const PUBLISHER_SLUG = "thibaud"

export async function getPublisher() {
  "use cache"
  cacheLife("days")
  cacheTag("legal-entity")
  return prisma.legalEntity.findUnique({
    where: { slug: PUBLISHER_SLUG },
    include: { address: true, publisher: true },
  })
}

export async function getDataProcessors() {
  "use cache"
  cacheLife("days")
  cacheTag("legal-entity")
  const processings = await prisma.dataProcessing.findMany({
    orderBy: { displayOrder: "asc" },
    include: { processor: { include: { address: true } } },
  })
  return processings.map(({ processor, ...processing }) => ({
    ...processor,
    processing: {
      ...processing,
      retentionPolicyKey: RetentionPolicyKey.parse(processing.retentionPolicyKey),
    },
  }))
}

export async function getHostingProvider() {
  "use cache"
  cacheLife("days")
  cacheTag("legal-entity")
  const processing = await prisma.dataProcessing.findFirst({
    where: { kind: "HOSTING" },
    include: { processor: { include: { address: true } } },
  })
  if (!processing) return null
  const { processor, ...processingFields } = processing
  return { ...processor, processing: processingFields }
}
