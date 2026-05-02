# Route API /api/assets/[filename]: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Exposer `GET /api/assets/[filename]` qui sert les images depuis `ASSETS_PATH`, avec validation Zod anti path-traversal + whitelist d'extensions, cache 1 an immutable, et 12 tests Vitest (6 unit + 6 integration).

**Architecture:** Route Handler Next.js 16 App Router + helper pur (`validateFilename`, `resolveAssetPath`, `getContentType`) + logger Pino child existant. Tests unit sur les fonctions pures (jsdom non requis) + tests integration en environnement Vitest `node` avec fixtures locales créées en `beforeAll`.

**Tech Stack:** Next.js 16 (App Router), TypeScript 6 strict, Zod 4, Pino 10.3, Vitest 4, Node.js 24.

**Spec source:** [docs/superpowers/specs/projets/04-route-api-assets-design.md](../../specs/projets/04-route-api-assets-design.md)

**Prérequis externes :** aucun dur. Le logger `src/lib/logger.ts` existe déjà. `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']` déjà configuré dans `next.config.ts`. `ASSETS_PATH` déjà dans `.env.example`.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/server/config/assets.ts` | Create | Helper pur : `FilenameSchema`, `validateFilename`, `resolveAssetPath`, `getContentType`, `CONTENT_TYPE_MAP` |
| `src/server/config/__tests__/assets.test.ts` | Create | 6 tests unit Vitest sur le helper (Zod schema, content-type map, resolveAssetPath) |
| `src/app/api/assets/[filename]/route.ts` | Create | Route Handler GET : orchestration validate → resolve → readFile → Response avec cache headers |
| `tests/integration/assets-route.integration.test.ts` | Create | 6 tests integration Vitest (path traversal, extension, 404, 200 + content-type + cache) |
| `assets/.gitkeep` | Create | Tracker le dossier vide en dev |
| `.gitignore` | Modify | Ajouter `/assets/*` + `!/assets/.gitkeep` |
| `src/lib/logger.ts` | Verify | Existe déjà, pas de modif |
| `next.config.ts` | Verify | `serverExternalPackages` Pino déjà OK |
| `.env.example` | Verify | `ASSETS_PATH=` déjà présent (ligne 3) |
| `compose.yaml` | Verify | Volume `portfolio_assets:/app/assets` déjà présent (ligne 33-34) |

---

### Task 1: Vérifications prérequis

**Files:** (vérifications read-only)

- [ ] **Step 1: Vérifier que `src/lib/logger.ts` existe**

Run:
```bash
ls src/lib/logger.ts
```
Expected : fichier présent. Si absent : créer un logger Pino basique conforme à [.claude/rules/pino/logger.md](../../../../.claude/rules/pino/logger.md) (hors scope ici, mais bloquant).

- [ ] **Step 2: Vérifier `next.config.ts`**

Run:
```bash
grep "serverExternalPackages" next.config.ts
```
Expected : ligne contenant `serverExternalPackages: ['pino', 'pino-pretty', 'thread-stream']`. Si absente : l'ajouter (règle Pino obligatoire).

- [ ] **Step 3: Vérifier `.env.example`**

Run:
```bash
grep "^ASSETS_PATH" .env.example
```
Expected : `ASSETS_PATH=` présent (avec commentaire optionnel). Si absent : l'ajouter sous la section `# === App ===`.

- [ ] **Step 4: Vérifier `.env` local (ASSETS_PATH défini)**

Run:
```bash
grep "^ASSETS_PATH" .env 2>/dev/null || echo "MISSING"
```

Si `MISSING` : ajouter `ASSETS_PATH=./assets` dans `.env` (valeur dev).

---

### Task 2: Créer le dossier `assets/` + `.gitkeep` + gitignore

**Files:**
- Create: `assets/.gitkeep`
- Modify: `.gitignore`

- [ ] **Step 1: Créer le dossier et le .gitkeep**

Run:
```bash
mkdir -p assets
touch assets/.gitkeep
```

- [ ] **Step 2: Ajouter les règles gitignore**

Ouvrir `.gitignore` et ajouter à la fin (après la dernière ligne non vide) :

```
# Assets locaux (servis par /api/assets en dev, volume Docker en prod)
/assets/*
!/assets/.gitkeep
```

- [ ] **Step 3: Vérifier que `.gitkeep` est tracké et que le reste du dossier est ignoré**

Run:
```bash
echo "trash" > assets/should-be-ignored.png
git check-ignore -v assets/should-be-ignored.png
git check-ignore -v assets/.gitkeep 2>&1 || echo "NOT ignored (OK)"
rm assets/should-be-ignored.png
```

Expected :
- `assets/should-be-ignored.png` est ignoré (match du pattern `/assets/*`).
- `assets/.gitkeep` n'est PAS ignoré (match de l'exception `!/assets/.gitkeep`).

---

### Task 3: Écrire les 6 tests unit sur le helper (TDD: test avant impl)

Règles appliquées : [.claude/rules/vitest/setup.md](../../../../.claude/rules/vitest/setup.md) (fichier `*.test.ts` sans `.integration.` → matché par `just test-unit`).

**Files:**
- Create: `src/server/config/__tests__/assets.test.ts`

- [ ] **Step 1: Créer le dossier + fichier de test**

Run:
```bash
mkdir -p src/server/config/__tests__
```

Créer `src/server/config/__tests__/assets.test.ts` avec ce contenu exact :

```typescript
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import {
  FilenameSchema,
  getContentType,
  resolveAssetPath,
  validateFilename,
} from '../assets'

describe('FilenameSchema + validateFilename', () => {
  it('accepte un filename simple avec extension whitelist', () => {
    expect(validateFilename('test.png')).toEqual({ ok: true, filename: 'test.png' })
    expect(validateFilename('cover.webp')).toEqual({ ok: true, filename: 'cover.webp' })
  })

  it('accepte les majuscules (flag i)', () => {
    expect(validateFilename('Test.PNG').ok).toBe(true)
    expect(validateFilename('photo.JPEG').ok).toBe(true)
  })

  it('rejette path traversal via slash ou backslash', () => {
    expect(validateFilename('../etc/passwd.png').ok).toBe(false)
    expect(validateFilename('..\\file.png').ok).toBe(false)
    expect(validateFilename('sub/folder/image.png').ok).toBe(false)
  })

  it('rejette null byte, caractères interdits, unicode', () => {
    expect(validateFilename('foo\u0000.png').ok).toBe(false)
    expect(validateFilename('📷.png').ok).toBe(false)
    expect(validateFilename('').ok).toBe(false)
  })

  it('rejette les extensions hors whitelist et les filenames commençant par un point', () => {
    expect(validateFilename('malware.exe').ok).toBe(false)
    expect(validateFilename('doc.pdf').ok).toBe(false)
    expect(validateFilename('page.html').ok).toBe(false)
    expect(validateFilename('.htaccess').ok).toBe(false)
    expect(validateFilename('.env').ok).toBe(false)
  })
})

describe('getContentType', () => {
  it('mape les 5 extensions whitelist vers le bon MIME (case-insensitive)', () => {
    expect(getContentType('a.png')).toBe('image/png')
    expect(getContentType('a.jpg')).toBe('image/jpeg')
    expect(getContentType('a.jpeg')).toBe('image/jpeg')
    expect(getContentType('a.webp')).toBe('image/webp')
    expect(getContentType('a.svg')).toBe('image/svg+xml')
    expect(getContentType('Test.PNG')).toBe('image/png')
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

  it('résout un filename valide sous la racine ASSETS_PATH', () => {
    const resolved = resolveAssetPath('test.png')
    const expectedRoot = path.resolve(process.env.ASSETS_PATH!)
    expect(resolved.startsWith(expectedRoot + path.sep)).toBe(true)
  })

  it('throw Error si le filename tenterait d échapper à la racine', () => {
    expect(() => resolveAssetPath('../../etc/passwd')).toThrow(/Path traversal/)
  })
})
```

- [ ] **Step 2: Run les tests: ils doivent FAIL (helper non créé)**

Run:
```bash
pnpm vitest run src/server/config/__tests__/assets.test.ts
```
Expected : FAIL avec `Cannot find module '../assets'` ou équivalent.

---

### Task 4: Créer le helper `src/server/config/assets.ts`

Règles appliquées : [.claude/rules/zod/validation.md](../../../../.claude/rules/zod/validation.md), [.claude/rules/typescript/conventions.md](../../../../.claude/rules/typescript/conventions.md).

**Files:**
- Create: `src/server/config/assets.ts`

- [ ] **Step 1: Créer le fichier**

Créer `src/server/config/assets.ts` avec ce contenu exact :

```typescript
import 'server-only'
import path from 'node:path'
import { z } from 'zod'

/**
 * Schéma Zod du filename autorisé.
 * Règle : commence par [a-z0-9], puis [a-z0-9._-]+, se termine par une extension whitelist.
 * Case-insensitive via flag `i`.
 */
export const FilenameSchema = z
  .string()
  .regex(
    /^[a-z0-9][a-z0-9._-]*\.(png|jpg|jpeg|webp|svg)$/i,
    'Filename must match [a-z0-9][a-z0-9._-]* and end with .png, .jpg, .jpeg, .webp or .svg',
  )

/**
 * Résultat de validation typé (discriminated union).
 */
export type ValidateFilenameResult =
  | { ok: true; filename: string }
  | { ok: false; error: string }

export function validateFilename(raw: string): ValidateFilenameResult {
  const parsed = FilenameSchema.safeParse(raw)
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? 'Invalid filename' }
  }
  return { ok: true, filename: parsed.data }
}

/**
 * Répertoire racine des assets. Fallback ./assets en dev si ASSETS_PATH absent.
 */
function getAssetsRoot(): string {
  return process.env.ASSETS_PATH ?? './assets'
}

/**
 * Résout le path absolu d'un asset depuis un filename validé.
 * Défense en profondeur : vérifie que le path résolu reste sous la racine,
 * même si la validation amont a laissé passer quelque chose d'inattendu.
 */
export function resolveAssetPath(filename: string): string {
  const root = path.resolve(getAssetsRoot())
  const candidate = path.resolve(root, filename)
  if (!candidate.startsWith(root + path.sep) && candidate !== root) {
    throw new Error(`Path traversal detected: "${filename}"`)
  }
  return candidate
}

/**
 * Mapping extension → MIME type.
 * Clefs en lowercase.
 */
export const CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export function getContentType(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase()
  return CONTENT_TYPE_MAP[ext] ?? 'application/octet-stream'
}
```

- [ ] **Step 2: Run les tests unit: ils doivent tous PASS**

Run:
```bash
pnpm vitest run src/server/config/__tests__/assets.test.ts
```
Expected : 6 tests PASS (couvre FilenameSchema + validateFilename, getContentType, resolveAssetPath).

- [ ] **Step 3: Vérifier la compilation TS**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 5: Écrire les 6 tests d'intégration (TDD: test avant impl)

Règle appliquée : [.claude/rules/vitest/setup.md](../../../../.claude/rules/vitest/setup.md) (environnement node pour tests d'intégration).

**Files:**
- Create: `tests/integration/assets-route.integration.test.ts`

- [ ] **Step 1: Créer le fichier de test**

Créer `tests/integration/assets-route.integration.test.ts` avec ce contenu exact :

```typescript
// @vitest-environment node
import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// Fixtures : dossier de test temporaire avec 2 fichiers valides
const TEST_ASSETS_DIR = path.resolve(process.cwd(), 'assets-test')

// PNG 1x1 transparent valide (binary minimum PNG)
const PNG_1X1 = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x62, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
])

const SVG_MIN = '<svg xmlns="http://www.w3.org/2000/svg"></svg>'

beforeAll(() => {
  mkdirSync(TEST_ASSETS_DIR, { recursive: true })
  writeFileSync(path.join(TEST_ASSETS_DIR, 'test.png'), PNG_1X1)
  writeFileSync(path.join(TEST_ASSETS_DIR, 'test.svg'), SVG_MIN)
  process.env.ASSETS_PATH = TEST_ASSETS_DIR
})

afterAll(() => {
  rmSync(TEST_ASSETS_DIR, { recursive: true, force: true })
  delete process.env.ASSETS_PATH
})

// Helper : appelle le Route Handler comme une fonction
async function callRoute(filename: string): Promise<Response> {
  const { GET } = await import('@/app/api/assets/[filename]/route')
  const url = `http://localhost:3000/api/assets/${filename}`
  const request = new Request(url)
  return GET(request, { params: Promise.resolve({ filename }) })
}

describe('GET /api/assets/[filename]', () => {
  it('retourne 400 sur path traversal URL-encodé (../../etc/passwd)', async () => {
    // Note: le filename arrive déjà décodé par Next.js au routing,
    // donc on teste avec la valeur décodée
    const response = await callRoute('../etc/passwd')
    expect(response.status).toBe(400)
  })

  it('retourne 400 sur null byte dans le filename', async () => {
    const response = await callRoute('foo\u0000.png')
    expect(response.status).toBe(400)
  })

  it('retourne 400 sur extension hors whitelist (.exe)', async () => {
    const response = await callRoute('malware.exe')
    expect(response.status).toBe(400)
  })

  it('retourne 404 sur fichier inexistant avec extension valide', async () => {
    const response = await callRoute('absent.png')
    expect(response.status).toBe(404)
  })

  it('retourne 200 + Content-Type image/png + Cache-Control immutable pour un PNG existant', async () => {
    const response = await callRoute('test.png')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('Cache-Control')).toBe(
      'public, max-age=31536000, immutable',
    )
    const body = Buffer.from(await response.arrayBuffer())
    expect(body.equals(PNG_1X1)).toBe(true)
  })

  it('retourne 200 + Content-Type image/svg+xml pour un SVG existant', async () => {
    const response = await callRoute('test.svg')
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/svg+xml')
  })
})
```

- [ ] **Step 2: Run les tests: ils doivent FAIL (handler non créé)**

Run:
```bash
pnpm vitest run assets-route.integration
```
Expected : FAIL avec `Cannot find module '@/app/api/assets/[filename]/route'` (ou équivalent sur l'import dynamique).

---

### Task 6: Implémenter le Route Handler `src/app/api/assets/[filename]/route.ts`

Règles appliquées : [.claude/rules/nextjs/api-routes.md](../../../../.claude/rules/nextjs/api-routes.md), [.claude/rules/pino/logger.md](../../../../.claude/rules/pino/logger.md).

**Files:**
- Create: `src/app/api/assets/[filename]/route.ts`

- [ ] **Step 1: Créer le dossier + fichier**

Run:
```bash
mkdir -p src/app/api/assets/\[filename\]
```

Créer `src/app/api/assets/[filename]/route.ts` avec ce contenu exact :

```typescript
import { readFile } from 'node:fs/promises'
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
    return new Response(validation.error, { status: 400 })
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
      return new Response('Not found', { status: 404 })
    }
    log.error({ err, filename: validation.filename }, 'assets: unexpected error')
    throw err
  }
}
```

- [ ] **Step 2: Vérifier la compilation TS**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

- [ ] **Step 3: Run les tests: ils doivent tous PASS**

Run:
```bash
pnpm vitest run assets-route.integration
```
Expected : 6 tests PASS.

Si FAIL :
- Sur test 1 (path traversal) : vérifier que la regex Zod rejette les `/` et `\`. La regex `[a-z0-9._-]+` n'accepte PAS `/`, donc `../etc/passwd` a des `/` → rejeté par Zod → 400. ✓
- Sur test 2 (null byte) : `\u0000` n'est pas dans `[a-z0-9._-]` → rejeté.
- Sur test 5 (PNG body) : si l'assert `body.equals(PNG_1X1)` fail, vérifier l'encoding (`Response` body ne doit pas être encodé en UTF-8). Utiliser `Buffer.from(arrayBuffer)` comme dans le test.

---

### Task 7: Smoke test manuel via curl

**Files:** (vérification live, aucun fichier modifié)

- [ ] **Step 1: Placer un fichier test dans `assets/`**

Run:
```bash
cp tests/integration/assets-route.integration.test.ts /tmp/src.ts 2>/dev/null || true
# Créer un PNG de test : télécharger un placeholder ou utiliser le même octet que dans les tests
pnpm exec node -e "
const fs = require('fs');
const PNG_1X1 = Buffer.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0x00,0x00,0x00,0x0d,0x49,0x48,0x44,0x52,0x00,0x00,0x00,0x01,0x00,0x00,0x00,0x01,0x08,0x06,0x00,0x00,0x00,0x1f,0x15,0xc4,0x89,0x00,0x00,0x00,0x0d,0x49,0x44,0x41,0x54,0x78,0x9c,0x62,0x00,0x01,0x00,0x00,0x05,0x00,0x01,0x0d,0x0a,0x2d,0xb4,0x00,0x00,0x00,0x00,0x49,0x45,0x4e,0x44,0xae,0x42,0x60,0x82]);
fs.writeFileSync('assets/test.png', PNG_1X1);
console.log('✔ assets/test.png créé (' + PNG_1X1.length + ' bytes)');
"
```

- [ ] **Step 2: Démarrer le serveur Next.js**

Run (dans un terminal séparé ou en arrière-plan) :
```bash
just dev &
```

Attendre ~5s que le serveur démarre (port 3000).

- [ ] **Step 3: Tester les 3 cas critiques via curl**

Run :
```bash
# Cas 200 : fichier valide
curl -sI http://localhost:3000/api/assets/test.png | head -5
```
Expected : `HTTP/1.1 200 OK`, `Content-Type: image/png`, `Cache-Control: public, max-age=31536000, immutable`.

Run :
```bash
# Cas 404 : fichier absent
curl -sI http://localhost:3000/api/assets/absent.png | head -1
```
Expected : `HTTP/1.1 404 Not Found`.

Run :
```bash
# Cas 400 : extension non whitelist
curl -sI http://localhost:3000/api/assets/malware.exe | head -1
```
Expected : `HTTP/1.1 400 Bad Request`.

- [ ] **Step 4: Nettoyer**

Run :
```bash
rm assets/test.png
just stop 2>/dev/null || true
```

---

### Task 8: Qualité + commit

- [ ] **Step 1: Lint**

Run:
```bash
just lint
```
Expected : 0 erreur, 0 warning.

- [ ] **Step 2: Typecheck**

Run:
```bash
just typecheck
```
Expected : 0 erreur TS.

- [ ] **Step 3: Full test suite (ne régresse pas ailleurs)**

Run:
```bash
just test
```
Expected : tous les tests existants + les 6 nouveaux passent.

- [ ] **Step 4: Vérifier l'état du repo**

Run:
```bash
git status
```

Attendu :
- Nouveaux : `src/server/config/assets.ts`, `src/server/config/__tests__/assets.test.ts`, `src/app/api/assets/[filename]/route.ts`, `tests/integration/assets-route.integration.test.ts`, `assets/.gitkeep`
- Modifié : `.gitignore`
- Non tracké mais ignoré : `assets/` (sauf `.gitkeep`)

- [ ] **Step 5: Commit**

Run:
```bash
git add src/server/config/ src/app/api/assets/ tests/integration/assets-route.integration.test.ts assets/.gitkeep .gitignore
git commit -m "$(cat <<'EOF'
feat(projets): route GET /api/assets/[filename] avec validation anti path-traversal

- src/server/config/assets.ts : helper pur (Zod FilenameSchema + whitelist extensions + resolveAssetPath + getContentType)
- src/server/config/__tests__/assets.test.ts : 6 tests unit (Zod schema, content-type map, resolveAssetPath défense en profondeur)
- src/app/api/assets/[filename]/route.ts : Route Handler GET avec logger Pino warn/debug
- tests/integration/assets-route.integration.test.ts : 6 tests integration (path traversal, null byte, extension hors whitelist, 404, 200 PNG, 200 SVG)
- assets/.gitkeep + .gitignore : dossier local dev trackable, contenu binaire ignoré
- Cache-Control: public, max-age=31536000, immutable

Spec: docs/superpowers/specs/projets/04-route-api-assets-design.md
EOF
)"
```
Expected : commit créé.

- [ ] **Step 6: Vérifier le commit**

Run:
```bash
git log -1 --stat
```
Expected : 1 commit récent listant les 6 fichiers (5 nouveaux + 1 modifié).

---

## Self-Review

**1. Spec coverage** :
- ✅ `Scope` helper + route + tests (unit + integration) → Tasks 3, 4, 5, 6
- ✅ `État livré` (curl 200/400/404 + 12 tests) → Task 7 steps 3 + Task 6 step 3 + Task 3 step 2
- ✅ `Dependencies` = aucune → Task 1 (vérifs prérequis)
- ✅ `Files touched` tous mappés : `src/server/config/assets.ts` (T4), `src/server/config/__tests__/assets.test.ts` (T3), `src/app/api/assets/[filename]/route.ts` (T6), `tests/integration/assets-route.integration.test.ts` (T5), `assets/.gitkeep` (T2), `.gitignore` (T2), `.env.example` / `compose.yaml` / `next.config.ts` / `src/lib/logger.ts` (T1 vérifs)
- ✅ `Architecture approach` :
  - Helper pur + fs.readFile direct (T4 + T6) ✓
  - Zod regex stricte + whitelist (T4 FilenameSchema) ✓
  - Défense en profondeur résolution path (T4 resolveAssetPath check startsWith) ✓
  - Logger Pino child `route: '/api/assets/[filename]'` (T6) ✓
  - Pas de cache Next.js server-side, juste header (T6) ✓
- ✅ `Acceptance criteria` : 6 scénarios → 6 tests integration (T5) + smoke test curl (T7)
- ✅ `Tests à écrire` : 6 unit + 6 integration listés dans le spec, tous présents dans T3 + T5
- ✅ `Edge cases` couverts explicitement par les tests unit T3 (majuscules acceptées par flag `i`, sous-dossier rejeté par absence de `/` dans la regex, unicode rejeté, `.htaccess` rejeté, string vide rejetée) + implicitement par la regex Zod (fichier 0 bytes retournera 200 avec Buffer vide, ASSETS_PATH absent → fallback `./assets`)
- ✅ `Architectural decisions` : toutes appliquées dans le code (helper simple pas d'interface, Zod + whitelist, 400/404 explicites, pas de rate-limit, cache 1 an immutable, log asymétrique warn/debug)
- ✅ `tdd_scope = full` → 12 tests (6 unit + 6 integration, section Tests à écrire avec sous-sections Unit + Integration)

**2. Placeholder scan** : aucun TBD/TODO. Exception assumée : Task 1 step 1 mentionne "si absent, créer logger (hors scope)", c'est un fallback conditionnel documenté, pas un placeholder.

**3. Type consistency** :
- `ValidateFilenameResult` discriminated union défini T4, utilisé par les tests T3 (via `.ok`) et par la route T6 (via `validation.ok`).
- `validateFilename`, `resolveAssetPath`, `getContentType` : signatures T4 identiques à leur usage T3 (tests) et T6 (route).
- `FilenameSchema`, `CONTENT_TYPE_MAP` : exports T4, `FilenameSchema` réutilisé dans les tests T3.
- Type `RouteContext` défini T6 cohérent avec `{ filename: string }` du test T5 (via `Promise.resolve({ filename })`).
- Noms de fonctions identiques entre spec, helper T4, route T6, tests unit T3 et tests integration T5.

---

## Prochaine étape

Après exécution de ce plan : passer au sub-project suivant `05-page-liste-projets-filtres` (spec à générer via `/decompose-feature projets`). Pour lancer l'implémentation de ce plan maintenant : `/implement-subproject projets 04`.
