---
paths:
  - "src/app/api/assets/**/*.ts"
  - "src/server/config/assets.ts"
  - "assets/**"
  - ".env*"
  - "compose.yaml"
---

# Next.js — Assets dynamiques (ADR-011)

## À faire
- Servir tous les assets dynamiques (images de projets, logos, captures, CV, etc.) via la route catch-all `GET /api/assets/[...path]` qui lit le filesystem à `process.env.ASSETS_PATH`
- Stocker les assets dans le dossier `assets/` à la racine en dev, dans le volume Docker `/app/assets` en prod (monté via `compose.yaml` sur le service Next.js)
- **Organisation en sous-dossiers** : convention `assets/projets/{client,personal}/<slug>/<filename>` (ex: `projets/client/foyer/logo.png`, `projets/personal/techno-scraper/cover.webp`). Le slug dossier correspond au slug DB (Company.slug ou Project.slug) pour cohérence
- **Organisation des documents publics** : convention `assets/documents/<slug>/<filename>` (ex: `documents/cv/cv-thibaud-geisler-fr.pdf`, `documents/cv/cv-thibaud-geisler-en.pdf`, `documents/plaquette-freelance/plaquette-fr.pdf`). Le slug `cv` est **réservé** pour le CV ; les fichiers CV suivent le pattern `cv-thibaud-geisler-<locale>.pdf` (locales alignées sur next-intl : `fr`, `en`). Comme pour `projets/`, les sous-dossiers ne sont pas versionnés (`.gitkeep` uniquement à la racine `assets/`) : ils se créent à la volée lors du premier dépôt de fichier en dev, ou via le volume Docker `portfolio_assets` en prod
- Valider chaque segment du `path` via un schéma Zod strict (regex `^[a-z0-9][a-z0-9._-]*$` par segment, insensible à la casse) et valider que le **dernier segment** porte une extension whitelist (png/jpg/jpeg/webp/svg/pdf). Profondeur max 5 segments
- Défense en profondeur : après `path.resolve(ASSETS_PATH, joined)`, vérifier que le résultat commence bien par `path.resolve(ASSETS_PATH) + path.sep` et throw sinon, même si la validation Zod amont a laissé passer quelque chose d'inattendu
- Retourner `Cache-Control` conditionnel : `public, max-age=31536000, immutable` en production (assets immutables, convention : changer le filename pour invalider, pas le cache) et `no-cache, no-store, must-revalidate` en dev (sinon Chrome garde 1 an le premier fichier servi localement, pénible au moindre remplacement d'asset)
- Retourner `NextResponse.json({ error }, { status: 400 })` pour path invalide, `{ status: 404 }` pour fichier inexistant (distinction HTTP standard, pas de `security through obscurity` sur des assets publics par nature)
- Logger warn sur 400 (signal potentiellement hostile), debug sur 404 (bruit normal)
- Pour référencer un asset dans `next/image`, utiliser une URL absolue `${NEXT_PUBLIC_APP_URL}/api/assets/projets/client/foyer/logo.png` et déclarer le domaine dans `images.remotePatterns` de `next.config.ts`

## À éviter
- Stocker les assets dynamiques dans `public/` : couplage au build, pas de hashing, incompatible avec un upload dashboard futur (ADR-011 contrainte actée, indépendante du choix de stockage)
- Accepter des segments contenant `/` ou `\` : chaque entrée du tableau `path` issu du catch-all Next doit être un segment atomique (la regex rejette tout séparateur interne). Rejeter `..` et `.` pour empêcher toute remontée hors de `ASSETS_PATH`
- Lire `ASSETS_PATH` sans fallback : utiliser `process.env.ASSETS_PATH ?? './assets'` pour que le dev marche même sans `.env` local, la prod reste couverte par les env vars Dokploy
- Tracker les fichiers binaires dans `assets/` : gitignore `/assets/*` + `!/assets/.gitkeep` obligatoire (le dossier existe en dev via `.gitkeep`, le contenu arrive via volume Docker en prod)
- Ajouter `export const dynamic` dans la route handler : incompatible avec `cacheComponents: true` (cf. `nextjs/api-routes.md`). Le `Cache-Control` HTTP + comportement dynamic par défaut suffisent
- Dépasser 5 segments de profondeur : la limite dure empêche l'explosion arborescente et reste cohérente avec la convention `projets/<type>/<slug>/<filename>` (4 segments). La marge à 5 reste pour les cas exceptionnels (ex: `projets/client/foyer/mission-2024/cover.webp`)

## Gotchas
- La route `/api/assets/[...path]` est dynamique par nature (`fs.readFile` à chaque requête), mais le `Cache-Control: immutable` côté navigateur rend les hits serveur marginaux en usage normal
- `fs.readFile` lève `ENOENT` si le fichier n'existe pas : catch spécifique sur `err.code === 'ENOENT'` pour renvoyer 404, re-throw tout autre erreur (permission, IO) pour que Next gère via `error.tsx`
- `path.extname(filename).slice(1).toLowerCase()` pour extraire l'extension puis lookup dans un `CONTENT_TYPE_MAP` centralisé — dériver la whitelist Zod depuis `Object.keys(CONTENT_TYPE_MAP)` pour single source of truth
- Le `params.path` d'un segment catch-all Next est toujours `string[]`, jamais `string` : pas besoin de split, passer le tableau directement à Zod
- **Migration future R2** (post-MVP avec dashboard upload) : remplacer le corps de `resolveAssetPath` par un fetch signé R2 (le path joined sert de clé d'objet) sans changer la signature côté route handler — pas d'interface `AssetStorage` prématurée (YAGNI)
- Le helper `src/server/config/assets.ts` doit importer `'server-only'` en tête pour empêcher tout import accidentel depuis un Client Component

## Exemples
```typescript
// ✅ Helper pur : Zod whitelist par segment + defense-in-depth path resolve
import 'server-only'
import path from 'node:path'
import { z } from 'zod'

export const CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', svg: 'image/svg+xml', pdf: 'application/pdf',
}

const ALLOWED = Object.keys(CONTENT_TYPE_MAP)
const SEGMENT = /^[a-z0-9][a-z0-9._-]*$/i

export const AssetPathSchema = z
  .array(z.string().regex(SEGMENT))
  .min(1)
  .max(5)
  .refine((segs) => {
    const ext = path.extname(segs.at(-1) ?? '').slice(1).toLowerCase()
    return ALLOWED.includes(ext)
  }, { message: 'Extension non autorisée' })

export function resolveAssetPath(joined: string): string {
  const root = path.resolve(process.env.ASSETS_PATH ?? './assets')
  const candidate = path.resolve(root, joined)
  if (!candidate.startsWith(root + path.sep) && candidate !== root) {
    throw new Error(`Path traversal detected: "${joined}"`)
  }
  return candidate
}
```

```typescript
// ✅ Route handler catch-all : validate → resolve → readFile → Response binaire
export async function GET(_req: Request, ctx: RouteContext): Promise<Response> {
  const { path: raw } = await ctx.params    // string[] depuis [...path]
  const v = validateAssetPath(raw)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    const data = await readFile(resolveAssetPath(v.joined))
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': getContentType(v.joined),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw err
  }
}
```

```yaml
# ✅ compose.yaml : volume nommé monté sur /app/assets en prod
services:
  nextjs:
    volumes:
      - portfolio_assets:/app/assets
    environment:
      - ASSETS_PATH=/app/assets
volumes:
  portfolio_assets:
```
