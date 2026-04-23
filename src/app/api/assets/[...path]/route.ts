import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  getContentType,
  resolveAssetPath,
  validateAssetPath,
} from '@/server/config/assets'

const log = logger.child({ route: '/api/assets/[...path]' })

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { path: raw } = await context.params

  const validation = validateAssetPath(raw)
  if (!validation.ok) {
    log.warn({ raw, error: validation.error }, 'assets: invalid path')
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const filepath = resolveAssetPath(validation.joined)

  try {
    const data = await readFile(filepath)
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': getContentType(validation.joined),
        // En prod les assets sont immutables (convention : renommer le fichier pour invalider).
        // En dev, revalider à chaque requête sinon Chrome garde 1 an le premier fichier servi → galère au moindre remplacement local.
        'Cache-Control':
          process.env.NODE_ENV === 'production'
            ? 'public, max-age=31536000, immutable'
            : 'no-cache, no-store, must-revalidate',
      },
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      log.debug({ path: validation.joined }, 'assets: not found')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    log.error({ err, path: validation.joined }, 'assets: unexpected error')
    throw err
  }
}
