---
paths:
  - "src/app/api/assets/**/*.ts"
  - "src/app/admin/(protected)/api/assets/**/*.ts"
  - "src/server/config/assets.ts"
  - "src/server/actions/assets.ts"
  - "src/server/queries/assets.ts"
  - "src/lib/schemas/asset.ts"
  - "src/lib/r2.ts"
  - ".env*"
---

# Next.js — Assets dynamiques (ADR-011)

## À faire
- Servir tous les assets publics (images de projets, captures, CV, branding) via la route catch-all `GET /api/assets/[...path]` qui lit le bucket Cloudflare R2 `portfolio-assets` (ou `portfolio-assets-dev` en développement) via `GetObjectCommand` du SDK S3
- **Deux buckets, jamais servis par la même route** : `portfolio-assets` (vitrine, lu par `/api/assets`) et `portfolio-admin` (back-office, logos d'entreprise sous `freelance/crm/entreprises/<slug>/logo.png`, 5 segments, jamais servi par la route publique). Le critère qui les sépare n'est pas qui édite le fichier (l'espace admin écrit dans les deux) mais **qui a le droit de le lire** : `portfolio-assets` porte ce que `/api/assets/[...path]` sert sans authentification, `portfolio-admin` ce qui n'est lu que par l'espace admin, derrière sa propre route gardée. Chacun a son token restreint, aucun ne lit l'autre bucket
- **Organisation `portfolio-assets`** : `branding/<fichier>` (2 segments, logo, portrait), `documents/cv/<fichier>` (3 segments, CV, un fichier par locale `cv-thibaud-geisler-<locale>.pdf`), `projets/{client,personal}/<slug-projet>/<fichier>` (4 segments, couverture, captures, vidéos du projet, sous **son propre** slug, `Project.slug`, plus le slug de l'entreprise pour un projet client)
- **L'emplacement choisi au dépôt détermine le bucket, jamais l'inverse** : le dossier sélectionné (`branding`, `documents/cv`, `projets/{client,personal}`, `freelance/crm/entreprises`) fixe à lui seul la destination, aucun autre paramètre ne l'influence
- Valider chaque segment du `path` via un schéma Zod strict (regex `^[a-z0-9][a-z0-9._-]*$` par segment, insensible à la casse) et valider que le **dernier segment** porte une extension whitelist (png/jpg/jpeg/webp/svg/pdf). Profondeur max 5 segments. Le chemin validé devient directement la clé d'objet R2
- Relayer le corps de la réponse en flux (`object.Body.transformToWebStream()`) plutôt que de le charger en mémoire : le CV en PDF étant le plus lourd des assets, cela évite de le tamponner entièrement à chaque requête
- Retourner `Cache-Control` conditionnel : `public, max-age=31536000, immutable` en production (assets immutables, convention : changer le filename pour invalider, pas le cache) et `no-cache, no-store, must-revalidate` en dev (sinon Chrome garde 1 an le premier fichier servi localement, pénible au moindre remplacement d'asset)
- Retourner `NextResponse.json({ error }, { status: 400 })` pour path invalide (avant tout appel R2), `{ status: 404 }` pour clé absente (distinction HTTP standard, pas de `security through obscurity` sur des assets publics par nature)
- Logger warn sur 400 (signal potentiellement hostile), debug sur 404 (bruit normal)
- Configurer le client S3 avec `region: "auto"`, l'endpoint `https://<R2_ACCOUNT_ID>.eu.r2.cloudflarestorage.com` (juridiction `eu` des buckets) et `requestChecksumCalculation: "WHEN_REQUIRED"`
- Pour référencer un asset dans `next/image`, utiliser le **chemin relatif** que construit `buildAssetUrl()`, jamais une URL absolue ni `images.remotePatterns` : voir `nextjs/images-fonts.md`

## À éviter
- Stocker les assets dynamiques dans `public/` : couplage au build, pas de hashing, incompatible avec l'upload depuis l'espace admin (ADR-011 contrainte actée, indépendante du choix de stockage)
- Accepter des segments contenant `/` ou `\` : chaque entrée du tableau `path` issu du catch-all Next doit être un segment atomique (la regex rejette tout séparateur interne). Rejeter `..` et `.` : le motif de segment l'exclut déjà en imposant de commencer par un caractère alphanumérique
- Ajouter `export const dynamic` dans la route handler : incompatible avec `cacheComponents: true` (cf. `nextjs/api-routes.md`). Le `Cache-Control` HTTP + comportement dynamic par défaut suffisent
- Dépasser 5 segments de profondeur : la limite dure empêche l'explosion arborescente et correspond exactement à la plus profonde des quatre structures valides, `freelance/crm/entreprises/<slug>/<fichier>` (`portfolio-admin`)
- Introduire une interface `AssetStorage` : une seule implémentation existe, l'écrire directement (YAGNI)

## Gotchas
- L'absence de clé se signale par une erreur `NoSuchKey` du SDK, pas par `ENOENT` : catch spécifique sur `err instanceof NoSuchKey` (classe exportée par `@aws-sdk/client-s3`) pour renvoyer 404, re-throw tout autre erreur pour que Next gère via `error.tsx`. Comparer `err.name` à une chaîne transformerait en 404 n'importe quelle erreur portant ce nom
- `path.extname(filename).slice(1).toLowerCase()` pour extraire l'extension puis lookup dans un `CONTENT_TYPE_MAP` centralisé : dériver la whitelist Zod depuis `Object.keys(CONTENT_TYPE_MAP)` pour single source of truth
- Le `params.path` d'un segment catch-all Next est toujours `string[]`, jamais `string` : pas besoin de split, passer le tableau directement à Zod
- R2 rejette le calcul de checksum CRC32 que le SDK S3 récent active par défaut : sans `requestChecksumCalculation: "WHEN_REQUIRED"`, les opérations échouent avec un message qui n'oriente pas vers la cause (sources : `docs/knowledges/cloudflare-r2.md`)
- Les objets de `portfolio-admin` se remplacent sur la même clé, un logo redéposé gardant son nom : la route gardée répond toujours `no-cache, no-store, must-revalidate`. Le `max-age=31536000, immutable` ne vaut que pour les assets publics, dont le nom change à chaque version
- Le helper `src/server/config/assets.ts` doit importer `'server-only'` en tête pour empêcher tout import accidentel depuis un Client Component
- Dev et prod pointent des buckets R2 distincts (`portfolio-assets-dev` / `portfolio-assets`), chacun avec son propre token : un défaut propre à R2 se manifeste pendant le développement sans qu'une manipulation locale puisse atteindre les données de production

## Exemples
```typescript
// ✅ Helper pur : Zod whitelist par segment, la clé validée sert directement d'objet R2
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
```

```typescript
// ✅ Client S3 pour R2 : région "auto", endpoint .eu, checksum désactivé
import { S3Client } from '@aws-sdk/client-s3'

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: { accessKeyId: env.R2_ASSETS_ACCESS_KEY_ID, secretAccessKey: env.R2_ASSETS_SECRET_ACCESS_KEY },
  requestChecksumCalculation: 'WHEN_REQUIRED',
})
```

```typescript
// ✅ Route handler catch-all : validate → GetObject → stream → Response
export async function GET(_req: Request, ctx: RouteContext): Promise<Response> {
  const { path: raw } = await ctx.params
  const v = validateAssetPath(raw)
  if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 })
  try {
    const object = await r2.send(new GetObjectCommand({ Bucket: R2_BUCKET, Key: v.joined }))
    return new Response(object.Body?.transformToWebStream(), {
      status: 200,
      headers: {
        'Content-Type': getContentType(v.joined),
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch (err) {
    if (err instanceof NoSuchKey) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw err
  }
}
```
