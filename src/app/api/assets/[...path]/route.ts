import { r2, R2_BUCKET } from "@/lib/r2"
import { serveAsset } from "@/server/config/assets"

interface RouteContext {
  params: Promise<{ path: string[] }>
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { path: raw } = await context.params

  return serveAsset(raw, {
    client: r2,
    bucket: R2_BUCKET,
    // Assets immutables (convention : renommer le fichier pour invalider). En dev, revalider à
    // chaque requête sinon Chrome garde 1 an le premier fichier servi localement.
    cacheControl:
      process.env.NODE_ENV === "production"
        ? "public, max-age=31536000, immutable"
        : "no-cache, no-store, must-revalidate",
    routeLabel: "/api/assets/[...path]",
  })
}
