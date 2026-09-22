import { NextResponse } from "next/server"

import { prisma } from "@/lib/prisma"
import { adminR2, r2, R2_ADMIN_BUCKET, R2_BUCKET } from "@/lib/r2"
import { isCompanyLogoKey } from "@/lib/schemas/asset"
import { serveAsset } from "@/server/config/assets"

interface RouteContext {
  params: Promise<{ path: string[] }>
}

const ROUTE_LABEL = "/api/assets/[...path]"

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { path: raw } = await context.params
  const key = raw.join("/")

  // Seule clé de portfolio-admin servie sans session : le logo d'une entreprise, et seulement
  // tant qu'il figure sur la vitrine, donc qu'un de ses projets est publié. Le logo d'un prospect
  // du CRM répond 404 comme s'il n'existait pas, quel que soit le slug deviné. Remplacé sur la
  // même clé au redépôt, donc jamais mis en cache.
  if (isCompanyLogoKey(key)) {
    const shown = await prisma.company.findFirst({
      where: { logoFilename: key, clientMetas: { some: { project: { status: "PUBLISHED" } } } },
      select: { id: true },
    })
    if (!shown) return NextResponse.json({ error: "Not found" }, { status: 404 })

    return serveAsset(raw, {
      client: adminR2,
      bucket: R2_ADMIN_BUCKET,
      cacheControl: "no-cache, no-store, must-revalidate",
      routeLabel: ROUTE_LABEL,
    })
  }

  return serveAsset(raw, {
    client: r2,
    bucket: R2_BUCKET,
    // Assets immutables (convention : renommer le fichier pour invalider). En dev, revalider à
    // chaque requête sinon Chrome garde 1 an le premier fichier servi localement.
    cacheControl:
      process.env.NODE_ENV === "production"
        ? "public, max-age=31536000, immutable"
        : "no-cache, no-store, must-revalidate",
    routeLabel: ROUTE_LABEL,
  })
}
