// @vitest-environment node
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

const TEST_ASSETS_DIR = path.resolve(process.cwd(), 'assets-test')

const PNG_1X1 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
])

const SVG_MIN = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

const PDF_MIN = Buffer.from('%PDF-1.4\n%%EOF\n', 'ascii')

beforeAll(() => {
  mkdirSync(path.join(TEST_ASSETS_DIR, 'projets', 'client', 'foyer'), { recursive: true })
  mkdirSync(path.join(TEST_ASSETS_DIR, 'documents', 'cv'), { recursive: true })
  writeFileSync(path.join(TEST_ASSETS_DIR, 'test.png'), PNG_1X1)
  writeFileSync(path.join(TEST_ASSETS_DIR, 'test.svg'), SVG_MIN)
  writeFileSync(
    path.join(TEST_ASSETS_DIR, 'projets', 'client', 'foyer', 'logo.png'),
    PNG_1X1,
  )
  writeFileSync(
    path.join(TEST_ASSETS_DIR, 'documents', 'cv', 'cv-test.pdf'),
    PDF_MIN,
  )
  process.env.ASSETS_PATH = TEST_ASSETS_DIR
})

afterAll(() => {
  rmSync(TEST_ASSETS_DIR, { recursive: true, force: true })
  delete process.env.ASSETS_PATH
})

async function callRoute(segments: string[]): Promise<Response> {
  const { GET } = await import('@/app/api/assets/[...path]/route')
  const url = `http://localhost:3000/api/assets/${segments.join('/')}`
  const request = new Request(url)
  return GET(request, { params: Promise.resolve({ path: segments }) })
}

describe('GET /api/assets/[...path]', () => {
  it('retourne 400 sur path traversal (..)', async () => {
    const response = await callRoute(['..', 'etc', 'passwd.png'])
    expect(response.status).toBe(400)
  })

  it('retourne 400 sur segment contenant un espace', async () => {
    const response = await callRoute(['foo .png'])
    expect(response.status).toBe(400)
  })

  it('retourne 400 sur extension hors whitelist (.exe)', async () => {
    const response = await callRoute(['malware.exe'])
    expect(response.status).toBe(400)
  })

  it('retourne 400 sur profondeur > 5 segments', async () => {
    const response = await callRoute(['a', 'b', 'c', 'd', 'e', 'f.png'])
    expect(response.status).toBe(400)
  })

  it('retourne 404 sur fichier inexistant avec chemin valide', async () => {
    const response = await callRoute(['absent.png'])
    expect(response.status).toBe(404)
  })

  it('retourne 200 + Content-Type image/png + Cache-Control no-cache en dev pour un PNG au root', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    try {
      const response = await callRoute(['test.png'])
      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toBe('image/png')
      expect(response.headers.get('Cache-Control')).toBe(
        'no-cache, no-store, must-revalidate',
      )
      const body = Buffer.from(await response.arrayBuffer())
      expect(body.equals(PNG_1X1)).toBe(true)
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('retourne Cache-Control immutable en production (branche NODE_ENV=production)', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    try {
      const response = await callRoute(['test.png'])
      expect(response.status).toBe(200)
      expect(response.headers.get('Cache-Control')).toBe(
        'public, max-age=31536000, immutable',
      )
    } finally {
      vi.unstubAllEnvs()
    }
  })

  it('retourne 200 + Content-Type image/svg+xml pour un SVG existant', async () => {
    const response = await callRoute(['test.svg'])
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
  })

  it('retourne 200 pour un PNG imbriqué sous projets/client/foyer/', async () => {
    const response = await callRoute(['projets', 'client', 'foyer', 'logo.png'])
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
  })

  it('retourne 200 + Content-Type application/pdf pour un PDF sous documents/cv/', async () => {
    const response = await callRoute(['documents', 'cv', 'cv-test.pdf'])
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.equals(PDF_MIN)).toBe(true)
  })
})
