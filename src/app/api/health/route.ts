import { connection, NextResponse } from "next/server"

export async function GET() {
  // Sans lecture runtime, cacheComponents prérend ce GET au build : le health check renverrait
  // un fichier statique au lieu de prouver que le serveur répond.
  await connection()
  return NextResponse.json(
    { status: "ok" },
    { headers: { "Cache-Control": "no-cache, no-store, must-revalidate" } },
  )
}
