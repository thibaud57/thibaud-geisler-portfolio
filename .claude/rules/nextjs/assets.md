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
- Servir tous les assets dynamiques (images de projets, logos, captures, CV, etc.) via la route API `GET /api/assets/[filename]` qui lit le filesystem à `process.env.ASSETS_PATH`
- Stocker les assets dans le dossier `assets/` à la racine en dev, dans le volume Docker `/app/assets` en prod (monté via `compose.yaml` sur le service Next.js)
- Valider le `filename` param via un schéma Zod strict (regex `^[a-z0-9][a-z0-9._-]*\.(png|jpg|jpeg|webp|svg)$` insensible à la casse) pour éviter path traversal et extensions non whitelist
- Défense en profondeur : après `path.resolve(ASSETS_PATH, filename)`, vérifier que le résultat commence bien par `path.resolve(ASSETS_PATH) + path.sep` et throw sinon, même si la validation Zod amont a laissé passer quelque chose d'inattendu
- Retourner `Cache-Control: public, max-age=31536000, immutable` sur les réponses 200 (assets immutables, convention : changer le filename pour invalider, pas le cache)
- Retourner `NextResponse.json({ error }, { status: 400 })` pour filename invalide, `{ status: 404 }` pour fichier inexistant (distinction HTTP standard, pas de `security through obscurity` sur des assets publics par nature)
- Logger warn sur 400 (signal potentiellement hostile), debug sur 404 (bruit normal)
- Pour référencer un asset dans `next/image`, utiliser une URL absolue `${NEXT_PUBLIC_APP_URL}/api/assets/file.webp` et déclarer le domaine dans `images.remotePatterns` de `next.config.ts`

## À éviter
- Stocker les assets dynamiques dans `public/` : couplage au build, pas de hashing, incompatible avec un upload dashboard futur (ADR-011 contrainte actée, indépendante du choix de stockage)
- Accepter des sous-chemins dans `filename` (`sub/folder/image.png`) : la regex doit rejeter `/` et `\` explicitement. Si besoin plus tard, refactor pour supporter des sous-dossiers avec validation dédiée
- Lire `ASSETS_PATH` sans fallback : utiliser `process.env.ASSETS_PATH ?? './assets'` pour que le dev marche même sans `.env` local, la prod reste couverte par les env vars Dokploy
- Tracker les fichiers binaires dans `assets/` : gitignore `/assets/*` + `!/assets/.gitkeep` obligatoire (le dossier existe en dev via `.gitkeep`, le contenu arrive via volume Docker en prod)
- Ajouter `export const dynamic` dans la route handler : incompatible avec `cacheComponents: true` (cf. `nextjs/api-routes.md`). Le `Cache-Control` HTTP + comportement dynamic par défaut suffisent

## Gotchas
- La route `/api/assets/[filename]` est dynamique par nature (`fs.readFile` à chaque requête), mais le `Cache-Control: immutable` côté navigateur rend les hits serveur marginaux en usage normal
- `fs.readFile` lève `ENOENT` si le fichier n'existe pas : catch spécifique sur `err.code === 'ENOENT'` pour renvoyer 404, re-throw tout autre erreur (permission, IO) pour que Next gère via `error.tsx`
- `path.extname(filename).slice(1).toLowerCase()` pour extraire l'extension puis lookup dans un `CONTENT_TYPE_MAP` centralisé — dériver la regex Zod depuis `Object.keys(CONTENT_TYPE_MAP)` pour single source of truth
- **Migration future R2** (post-MVP avec dashboard upload) : remplacer le corps de `resolveAssetPath` par un fetch signé R2 sans changer la signature côté route handler — pas d'interface `AssetStorage` prématurée (YAGNI)
- Le helper `src/server/config/assets.ts` doit importer `'server-only'` en tête pour empêcher tout import accidentel depuis un Client Component

## Exemples
```typescript
// ✅ Helper pur : Zod whitelist + defense-in-depth path resolve
import 'server-only'
import path from 'node:path'
import { z } from 'zod'

export const CONTENT_TYPE_MAP: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
  webp: 'image/webp', svg: 'image/svg+xml',
}

const ALLOWED = Object.keys(CONTENT_TYPE_MAP)
export const FilenameSchema = z.string().regex(
  new RegExp(`^[a-z0-9][a-z0-9._-]*\\.(${ALLOWED.join('|')})$`, 'i'),
)

export function resolveAssetPath(filename: string): string {
  const root = path.resolve(process.env.ASSETS_PATH ?? './assets')
  const candidate = path.resolve(root, filename)
  if (!candidate.startsWith(root + path.sep) && candidate !== root) {
    throw new Error(`Path traversal detected: "${filename}"`)
  }
  return candidate
}
```

```typescript
// ✅ Route handler : validate → resolve → readFile → Response binaire
export async function GET(_req: Request, ctx: RouteContext): Promise<Response> {
  const { filename: raw } = await ctx.params
  const v = validateFilename(raw)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    const data = await readFile(resolveAssetPath(v.filename))
    return new Response(data, {
      status: 200,
      headers: {
        'Content-Type': getContentType(v.filename),
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
