import "server-only"
import { ListObjectsV2Command, type S3Client } from "@aws-sdk/client-s3"

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

// Une clé peut être citée dans le markdown d'un case study sans vivre dans aucune colonne dédiée :
// mêmes trois façons de référencer un asset que deleteAsset, résolues ici pour toutes les clés
// en une passe (deux requêtes, jamais une par asset).
export async function resolveAssetUsage(keys: string[]): Promise<AssetUsage> {
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

  return new Map(
    keys.map((key) => {
      const usedBy = [
        ...projects
          .filter(
            (project) =>
              project.coverFilename === key ||
              (project.caseStudyMarkdownFr ?? "").includes(key) ||
              (project.caseStudyMarkdownEn ?? "").includes(key),
          )
          .map((project) => project.slug),
        ...companies
          .filter((company) => company.logoFilename === key)
          .map((company) => company.slug),
      ]
      return [key, usedBy] as const
    }),
  )
}
