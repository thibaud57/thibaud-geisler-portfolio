import { getCurrentUser } from "@/lib/get-current-user"
import { adminR2, R2_ADMIN_BUCKET } from "@/lib/r2"
import { serveAsset } from "@/server/config/assets"

interface RouteContext {
  params: Promise<{ path: string[] }>
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  await getCurrentUser()

  const { path: raw } = await context.params

  return serveAsset(raw, {
    client: adminR2,
    bucket: R2_ADMIN_BUCKET,
    // Bucket admin jamais immuable (ex. logo remplacé) : même valeur en dev et prod, voir nextjs/assets.md.
    cacheControl: "no-cache, no-store, must-revalidate",
    routeLabel: "/admin/api/assets/[...path]",
  })
}
