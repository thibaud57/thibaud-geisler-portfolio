import { readFile } from 'node:fs/promises'
import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import {
  getContentType,
  resolveAssetPath,
  validateFilename,
} from '@/server/config/assets'

const log = logger.child({ route: '/api/assets/[filename]' })

type RouteContext = { params: Promise<{ filename: string }> }

export async function GET(
  _request: Request,
  context: RouteContext,
): Promise<Response> {
  const { filename: raw } = await context.params

  const validation = validateFilename(raw)
  if (!validation.ok) {
    log.warn({ raw, error: validation.error }, 'assets: invalid filename')
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  const filepath = resolveAssetPath(validation.filename)

  try {
    const data = await readFile(filepath)
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': getContentType(validation.filename),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      log.debug({ filename: validation.filename }, 'assets: not found')
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    log.error({ err, filename: validation.filename }, 'assets: unexpected error')
    throw err
  }
}
