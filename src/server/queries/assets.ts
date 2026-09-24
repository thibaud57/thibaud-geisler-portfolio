import "server-only"
import { ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3"

import type { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { adminR2, r2, R2_ADMIN_BUCKET, R2_BUCKET } from "@/lib/r2"

export interface AssetEntry {
  key: string
  size: number
  lastModified?: Date
}

async function listBucket(
  client: S3Client,
  bucket: string,
  prefix?: string,
): Promise<AssetEntry[]> {
  const entries: AssetEntry[] = []
  let continuationToken: string | undefined

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )

    for (const object of page.Contents ?? []) {
      if (object.Key) {
        entries.push({
          key: object.Key,
          size: object.Size ?? 0,
          lastModified: object.LastModified,
        })
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (continuationToken)

  return entries
}

export async function listAssets(prefix?: string): Promise<AssetEntry[]> {
  const entries = await listBucket(r2, R2_BUCKET, prefix)
  return entries.sort((a, b) => a.key.localeCompare(b.key))
}

export async function listAdminAssets(prefix?: string): Promise<AssetEntry[]> {
  const entries = await listBucket(adminR2, R2_ADMIN_BUCKET, prefix)
  return entries.sort((a, b) => a.key.localeCompare(b.key))
}

export type AssetUsage = Map<string, string[]>

interface ProjectAssetRecord {
  coverFilename: string | null
  caseStudyMarkdownFr: string | null
  caseStudyMarkdownEn: string | null
}

interface ProjectAssetReference {
  matches: (project: ProjectAssetRecord, key: string) => boolean
  whereCondition: (key: string) => Prisma.ProjectWhereInput
}

// Les trois façons dont un projet peut référencer un asset (une correspondance exacte pour la
// couverture, une sous-chaîne pour le markdown de chaque locale du case study) : deleteAsset (filtre
// SQL, une clé) et matchAssetUsage (filtre en mémoire, N clés) partagent cette définition pour ne
// jamais diverger, tout en gardant chacun sa propre stratégie de requête.
export const PROJECT_ASSET_REFERENCES: readonly ProjectAssetReference[] = [
  {
    matches: (project, key) => project.coverFilename === key,
    whereCondition: (key) => ({ coverFilename: key }),
  },
  {
    matches: (project, key) => (project.caseStudyMarkdownFr ?? "").includes(key),
    whereCondition: (key) => ({ caseStudyMarkdownFr: { contains: key } }),
  },
  {
    matches: (project, key) => (project.caseStudyMarkdownEn ?? "").includes(key),
    whereCondition: (key) => ({ caseStudyMarkdownEn: { contains: key } }),
  },
]

export const COMPANY_LOGO_FIELD = "logoFilename" as const

export interface AssetReferences {
  projects: (ProjectAssetRecord & { slug: string })[]
  companies: { slug: string; logoFilename: string | null }[]
}

export async function loadAssetReferences(): Promise<AssetReferences> {
  const [projects, companies] = await Promise.all([
    prisma.project.findMany({
      select: {
        slug: true,
        coverFilename: true,
        caseStudyMarkdownFr: true,
        caseStudyMarkdownEn: true,
      },
    }),
    prisma.company.findMany({ select: { slug: true, logoFilename: true } }),
  ])
  return { projects, companies }
}

export function matchAssetUsage(references: AssetReferences, keys: string[]): AssetUsage {
  return new Map(
    keys.map((key) => {
      const usedBy = [
        ...references.projects
          .filter((project) => PROJECT_ASSET_REFERENCES.some((ref) => ref.matches(project, key)))
          .map((project) => project.slug),
        ...references.companies
          .filter((company) => company[COMPANY_LOGO_FIELD] === key)
          .map((company) => company.slug),
      ]
      return [key, usedBy] as const
    }),
  )
}
