import { GetObjectCommand, NoSuchKey } from "@aws-sdk/client-s3"
import { NextResponse } from "next/server"
import { logger } from "@/lib/logger"
import { r2, R2_BUCKET } from "@/lib/r2"
import { getContentType, validateAssetPath } from "@/server/config/assets"

const log = logger.child({ route: "/api/assets/[...path]" })

interface RouteContext {
  params: Promise<{ path: string[] }>
}

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  const { path: raw } = await context.params

  const validation = validateAssetPath(raw)
  if (!validation.ok) {
    log.warn({ raw, error: validation.error }, "assets: invalid path")
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const object = await r2.send(
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: validation.joined }),
    )

    if (!object.Body) {
      log.debug({ path: validation.joined }, "assets: empty body")
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }

    return new Response(object.Body.transformToWebStream(), {
      status: 200,
      headers: {
        "Content-Type": getContentType(validation.joined),
        ...(object.ContentLength !== undefined && {
          "Content-Length": String(object.ContentLength),
        }),
        // En prod les assets sont immutables (convention : renommer le fichier pour invalider).
        // En dev, revalider à chaque requête sinon Chrome garde 1 an le premier fichier servi → galère au moindre remplacement local.
        "Cache-Control":
          process.env.NODE_ENV === "production"
            ? "public, max-age=31536000, immutable"
            : "no-cache, no-store, must-revalidate",
      },
    })
  } catch (err) {
    if (err instanceof NoSuchKey) {
      log.debug({ path: validation.joined }, "assets: not found")
      return NextResponse.json({ error: "Not found" }, { status: 404 })
    }
    log.error({ err, path: validation.joined }, "assets: unexpected error")
    throw err
  }
}
