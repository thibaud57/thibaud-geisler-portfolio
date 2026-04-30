// @vitest-environment node
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { getContentType, resolveAssetPath, validateAssetPath } from './assets'

describe('AssetPathSchema + validateAssetPath', () => {
  it('accepte un chemin simple à 1 segment avec extension whitelist', () => {
    expect(validateAssetPath(['test.png'])).toEqual({
      ok: true,
      segments: ['test.png'],
      joined: 'test.png',
    })
  })

  it('accepte un chemin imbriqué jusqu à 5 segments', () => {
    expect(validateAssetPath(['projets', 'client', 'foyer', 'logo.png']).ok).toBe(true)
    expect(validateAssetPath(['projets', 'client', 'foyer', 'webapp-gestion-sinistres-1.webp']).ok).toBe(true)
    expect(validateAssetPath(['a', 'b', 'c', 'd', 'e.svg']).ok).toBe(true)
  })

  it('accepte les majuscules (flag i)', () => {
    expect(validateAssetPath(['Test.PNG']).ok).toBe(true)
    expect(validateAssetPath(['Projets', 'Client', 'Photo.JPEG']).ok).toBe(true)
  })

  it('rejette path traversal (.. et .)', () => {
    expect(validateAssetPath(['..', 'etc', 'passwd.png']).ok).toBe(false)
    expect(validateAssetPath(['.', 'image.png']).ok).toBe(false)
    expect(validateAssetPath(['projets', '..', 'secret.png']).ok).toBe(false)
  })

  it('rejette les segments avec slash ou backslash interne', () => {
    expect(validateAssetPath(['sub/folder', 'image.png']).ok).toBe(false)
    expect(validateAssetPath(['..\\file.png']).ok).toBe(false)
  })

  it('rejette null byte, caractères interdits, unicode, segments vides', () => {
    expect(validateAssetPath(['foo .png']).ok).toBe(false)
    expect(validateAssetPath(['📷.png']).ok).toBe(false)
    expect(validateAssetPath(['']).ok).toBe(false)
    expect(validateAssetPath([]).ok).toBe(false)
  })

  it('rejette les extensions hors whitelist et segments commençant par un point', () => {
    expect(validateAssetPath(['malware.exe']).ok).toBe(false)
    expect(validateAssetPath(['doc.docx']).ok).toBe(false)
    expect(validateAssetPath(['.htaccess']).ok).toBe(false)
  })

  it('rejette les profondeurs supérieures à 5 segments', () => {
    expect(validateAssetPath(['a', 'b', 'c', 'd', 'e', 'f.png']).ok).toBe(false)
  })

  it('exige une extension valide sur le dernier segment uniquement', () => {
    expect(validateAssetPath(['projets', 'client', 'logo.png']).ok).toBe(true)
    expect(validateAssetPath(['projets.png', 'client', 'logo']).ok).toBe(false)
  })

  it('accepte un PDF sous documents/cv/', () => {
    expect(
      validateAssetPath(['documents', 'cv', 'cv-thibaud-geisler-fr.pdf']).ok,
    ).toBe(true)
  })

  it('accepte un PDF avec extension majuscule (flag i)', () => {
    expect(validateAssetPath(['documents', 'cv', 'CV-TEST.PDF']).ok).toBe(true)
  })
})

describe('getContentType', () => {
  it('mape les 6 extensions whitelist vers le bon MIME (case-insensitive)', () => {
    expect(getContentType('a.png')).toBe('image/png')
    expect(getContentType('a.jpg')).toBe('image/jpeg')
    expect(getContentType('a.jpeg')).toBe('image/jpeg')
    expect(getContentType('a.webp')).toBe('image/webp')
    expect(getContentType('a.svg')).toBe('image/svg+xml')
    expect(getContentType('a.pdf')).toBe('application/pdf')
    expect(getContentType('Test.PNG')).toBe('image/png')
    expect(getContentType('CV.PDF')).toBe('application/pdf')
  })

  it('retourne application/octet-stream sur extension inconnue', () => {
    expect(getContentType('a.xyz')).toBe('application/octet-stream')
    expect(getContentType('noext')).toBe('application/octet-stream')
  })
})

describe('resolveAssetPath (défense en profondeur)', () => {
  const ORIGINAL = process.env.ASSETS_PATH

  beforeEach(() => {
    process.env.ASSETS_PATH = path.resolve(process.cwd(), 'assets-test-resolve')
  })

  afterEach(() => {
    if (ORIGINAL === undefined) delete process.env.ASSETS_PATH
    else process.env.ASSETS_PATH = ORIGINAL
  })

  it('résout un chemin imbriqué sous la racine ASSETS_PATH', () => {
    const resolved = resolveAssetPath('projets/client/foyer/logo.png')
    const expectedRoot = path.resolve(process.env.ASSETS_PATH!)
    expect(resolved.startsWith(expectedRoot + path.sep)).toBe(true)
  })

  it('throw Error si le chemin tenterait d échapper à la racine', () => {
    expect(() => resolveAssetPath('../../etc/passwd')).toThrow(/Path traversal/)
  })
})
