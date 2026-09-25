# Gestion des assets depuis l'espace admin — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Déposer, lister et supprimer des assets depuis l'administration, et fournir le sélecteur qui les rattachera aux projets et aux entreprises.

**Architecture:** Le fichier transite par une Server Action, qui le valide avec la même fonction que la lecture avant de l'écrire dans R2. La suppression consulte d'abord la base pour refuser tout asset encore référencé, sur le même principe que les tags et les entreprises.

**Tech Stack:** `@aws-sdk/client-s3`, Next.js 16 Server Actions, Prisma 7, shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/espace-admin/10-gestion-assets-admin-design.md`

## Global Constraints

- `serverActions.bodySizeLimit` relevé à **8 Mo**. Le défaut de 1 Mo est trop bas pour une capture PNG, et la mise en garde de Next sur les ressources ne s'applique pas derrière l'authentification.
- **Chaque Server Action ouvre par `await getCurrentUser()`**, hors de tout `try/catch`. Une action exportée est un endpoint HTTP invocable par quiconque connaît son identifiant : le layout protège l'affichage des pages, pas l'exécution des actions. `.claude/rules/nextjs/server-actions.md` l'impose deux fois, en « à faire » (défense en profondeur) et en « à éviter » (dépendre uniquement du proxy). L'appel doit précéder le `try`, sans quoi le `catch` avalerait l'interruption `unauthorized()` et transformerait un refus d'accès en `unknown_error`.
- **Pas d'URL présignée** : la Server Action garde l'avantage que le serveur voit le fichier et peut le valider avant écriture.
- **La modale de dépôt soumet par `onSubmit` + `startTransition`, jamais par `<form action>`** : son `Select` d'emplacement perdrait sa valeur au premier reset après erreur, comme le `Select` Taille du `08` ou celui des tags.
- Les clés suivent la convention existante : `projets/{client,personal}/<slug>/<filename>`, `documents/cv/<filename>`, `branding/<filename>` sur `portfolio-assets`, et `freelance/crm/entreprises/<slug>/<filename>` sur `portfolio-admin`.
- Le chemin complet passe par **`validateAssetPath`** avant écriture : un fichier qu'on ne pourrait pas relire n'a aucune raison d'être écrit.
- **Taille et type MIME sont vérifiés côté serveur**, `.claude/rules/nextjs/server-actions.md` l'imposant explicitement : « valider taille et type MIME des fichiers `FormData` côté serveur, ne pas se fier au `accept` HTML ». Le MIME annoncé doit correspondre à l'extension, faute de quoi un `.png` renommé serait servi plus tard avec un `Content-Type` qui ne décrit pas son contenu.
- La suppression est **refusée** si l'asset est référencé par `Project.coverFilename`, par `freelance.Company.logoFilename`, **ou cité dans `caseStudyMarkdownFr` / `caseStudyMarkdownEn`**, et le message nomme les éléments concernés. Les captures de case study ne vivent dans aucune colonne dédiée : les oublier revient à autoriser la suppression d'une image affichée en production.
- **Deux buckets.** Le sub-project `09` a réparti les fichiers selon ce qu'une route publique a le droit de servir : `portfolio-assets` pour la vitrine, lue sans authentification, `portfolio-admin` pour le back-office, lue par une route gardée sous `/admin`. L'emplacement choisi dans le formulaire détermine le bucket, jamais l'inverse. Déposer un logo d'entreprise dans `portfolio-assets` défairait ce que le `09` vient d'établir.
- **Trois contrôles au dépôt** : un emplacement dans une liste fermée, un slug quand l'emplacement en attend un, le nom du fichier. Un asset de projet demande deux niveaux intermédiaires (`client` puis le slug), c'est le cas le plus fréquent et un « dossier plus sous-dossier » ne le couvre pas.
- **Aucun composant shadcn à installer** : `dialog`, `select`, `alert-dialog`, `pagination`, `checkbox`, `popover`, `command` sont déjà en place depuis le `07`.
- Le listing suit le **jeton de continuation** : `ListObjectsV2` plafonne à mille objets par appel.
- **La grille de tuiles suit des paliers fixes**, pas le `auto-fill` fluide de la maquette : une colonne par défaut, deux dès `sm`, trois dès `md`, quatre dès `lg`, cinq dès `xl`, pour des tuiles d'environ 200px.
- **Grille plate filtrée par une facette « Dossier »**, jamais une liste groupée par préfixe. Chaque tuile porte une action copier-le-chemin (`/api/assets/<clé>`) en plus de la suppression, sans date de modification affichée. Le pied de grille n'a pas de sélecteur « lignes par page » : ce n'est pas un `DataTable`.
- R2 **écrase sans avertir** un objet de même clé : le dépôt sur une clé existante affiche un avertissement `text-sm text-destructive` dans le corps de la modale, sans `Alert`, et exige une confirmation explicite avant l'envoi.
- **`AssetPicker` sert deux usages dès ce sub-project** : la carte Logo du formulaire entreprise (`freelance/crm/entreprises/` sur `portfolio-admin`, câblée ici), et la couverture de projet (`projets/` sur `portfolio-assets`, câblée au `13`).
- Aucun modèle Prisma ajouté : un asset est un objet du bucket, référencé par son nom depuis `Project` ou `Company`, conformément à l'ADR-011.
- Les dépôts locaux vont dans `portfolio-assets-dev`, la production dans `portfolio-assets`.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/nextjs/assets.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/configuration.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/vitest/setup.md`.

---

### Task 1 : Configuration et schéma

**Files:**
- Modify: `next.config.ts`
- Create: `src/lib/schemas/asset.ts`
- Create: `src/server/actions/assets.types.ts`
- Modify: `src/lib/r2.ts` (second client, bucket `portfolio-admin`)
- Modify: `src/env.ts` et `.env.example` (variables du bucket admin)

**Interfaces:**
- Consomme : `CONTENT_TYPE_MAP` de `src/server/config/assets.ts`.
- Produit : `assetUploadSchema`, `ASSET_FOLDERS`, `MAX_ASSET_BYTES`, `AssetFormState`, `isAdminAssetKey`, `adminR2`, `R2_ADMIN_BUCKET`, consommés par les Tasks 2 et 3.

- [ ] **Step 1: Relever la limite de taille**

Dans `next.config.ts`, compléter le bloc `experimental` existant :

```typescript
  experimental: {
    globalNotFound: true, // antérieur à l'espace admin, ne jamais retirer
    authInterrupts: true,
    taint: true,
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
```

Relire le bloc réel avant d'écrire : `globalNotFound` y est depuis longtemps et porte le 404 des URLs hors segment de locale, `authInterrupts` et `taint` viennent du sub-project `05`. Recopier ce snippet sans vérifier écraserait le premier.

- [ ] **Step 2: Écrire le schéma de dépôt**

```typescript
import { z } from 'zod'

import { CONTENT_TYPE_MAP } from '@/server/config/assets'

export const MAX_ASSET_BYTES = 8 * 1024 * 1024

// Arborescence ADR-011, deux buckets :
//   branding/<fichier>                              → logos et portrait (portfolio-assets)
//   documents/cv/<fichier>                          → CV par locale (portfolio-assets)
//   projets/{client,personal}/<slug>/<fichier>      → couvertures et captures de projets (portfolio-assets)
//   freelance/crm/entreprises/<slug>/<fichier>      → logo d'entreprise (portfolio-admin)
export const FOLDERS_WITH_SLUG = ['projets/client', 'projets/personal', 'freelance/crm/entreprises'] as const
export const FOLDERS_WITHOUT_SLUG = ['branding', 'documents/cv'] as const
export const ASSET_FOLDERS = [...FOLDERS_WITH_SLUG, ...FOLDERS_WITHOUT_SLUG] as const

const ADMIN_FOLDER = 'freelance/crm/entreprises'

// Seul ce dossier vit sur portfolio-admin : une clé qui y commence n'est jamais lue par la route publique.
export function isAdminAssetKey(key: string): boolean {
  return key.startsWith(`${ADMIN_FOLDER}/`)
}

const ALLOWED_EXTENSIONS = Object.keys(CONTENT_TYPE_MAP)
const FILENAME_PATTERN = /^[a-z0-9][a-z0-9._-]*$/
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const assetUploadSchema = z
  .object({
    folder: z.enum(ASSET_FOLDERS, { error: 'Dossier de destination invalide' }),
    slug: z.string().trim().toLowerCase().optional(),
    filename: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Le nom du fichier est requis')
      .regex(FILENAME_PATTERN, 'Le nom ne peut contenir que des minuscules, chiffres, points, tirets et underscores')
      .refine(
        (value) => ALLOWED_EXTENSIONS.includes(value.split('.').pop() ?? ''),
        { message: `Extension non autorisée (attendu : ${ALLOWED_EXTENSIONS.join(', ')})` },
      ),
  })
  .superRefine((data, ctx) => {
    const needsSlug = (FOLDERS_WITH_SLUG as readonly string[]).includes(data.folder)

    if (needsSlug && !data.slug) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: 'Ce dossier attend un sous-dossier de destination',
      })
      return
    }
    if (needsSlug && data.slug && !SLUG_PATTERN.test(data.slug)) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: 'Slug invalide : minuscules, chiffres et tirets uniquement',
      })
    }
    if (!needsSlug && data.slug) {
      ctx.addIssue({
        code: 'custom',
        path: ['slug'],
        message: "Ce dossier n'accepte pas de sous-dossier",
      })
    }
  })

export type AssetUploadInput = z.infer<typeof assetUploadSchema>

export function buildAssetKey(input: AssetUploadInput): string {
  return input.slug
    ? `${input.folder}/${input.slug}/${input.filename}`
    : `${input.folder}/${input.filename}`
}
```

Le slug est **conditionnel** : `branding/` et `documents/cv/` reçoivent leurs fichiers directement, alors que `projets/client`, `projets/personal` et `freelance/crm/entreprises` attendent un sous-dossier, respectivement le slug du projet et celui de l'entreprise. Cette asymétrie n'est pas un choix mais un constat de l'arborescence existante, où `branding/portrait.jpg` voisine avec `documents/cv/cv-thibaud-geisler-fr.pdf`. Un schéma imposant un slug partout rendrait impossible le dépôt d'un logo de marque.

`buildAssetKey` centralise la composition de la clé pour que la règle du slug conditionnel ne soit écrite qu'une fois.

`ASSET_FOLDERS` reste une liste fermée plutôt qu'un chemin libre : c'est ce qui empêche l'arborescence de diverger de ce que la route sait servir. La liste d'extensions est dérivée de `CONTENT_TYPE_MAP`, donc écriture et lecture ne peuvent pas diverger. `isAdminAssetKey` est la seule règle qui décide du bucket : elle sert aussi bien au dépôt (Task 2) qu'à la lecture authentifiée (Task 3).

`.toLowerCase()` sur le nom de fichier traite le cas le plus fréquent, un fichier venu du système de l'utilisateur nommé `Capture Écran.PNG`. Les espaces et accents restent refusés par le motif, avec un message explicite plutôt qu'une normalisation silencieuse qui produirait un nom surprenant.

- [ ] **Step 3: Écrire les types d'état**

```typescript
import type { AssetUploadInput } from '@/lib/schemas/asset'

export type AssetFormMessage =
  | 'file_too_large'
  | 'file_empty'
  | 'file_type_mismatch'
  | 'asset_in_use'
  | 'already_exists'
  | 'unknown_error'
  | null

export type AssetFormState = {
  ok: boolean | null
  errors: Partial<Record<keyof AssetUploadInput | 'file', string[]>>
  message: AssetFormMessage
  usedBy?: string[]
}

export const initialAssetFormState: AssetFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

`usedBy` porte les noms des projets et entreprises qui référencent un asset, pour que le refus de suppression soit exploitable.

- [ ] **Step 4: Second client R2, sur `portfolio-admin`**

Le `09` n'a créé qu'un client, pour `portfolio-assets`. Ce sub-project est le premier à écrire dans `portfolio-admin` : il lui faut son propre client, sur son propre token, la séparation des deux buckets n'ayant de sens que si aucun client ne peut lire l'autre.

Dans `src/env.ts`, section `server`, à côté des quatre variables `R2_*` du `09` :

```typescript
    R2_ADMIN_ACCESS_KEY_ID: z.string().min(1),
    R2_ADMIN_SECRET_ACCESS_KEY: z.string().min(1),
    R2_ADMIN_BUCKET: z.string().min(1),
```

`R2_ACCOUNT_ID` est réutilisé, les deux buckets vivant sur le même compte Cloudflare.

Dans `src/lib/r2.ts` :

```typescript
export const adminR2 = new S3Client({
  region: 'auto',
  endpoint: `https://${env.R2_ACCOUNT_ID}.eu.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: env.R2_ADMIN_ACCESS_KEY_ID,
    secretAccessKey: env.R2_ADMIN_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
})

export const R2_ADMIN_BUCKET = env.R2_ADMIN_BUCKET
```

Documenter les trois variables dans `.env.example`, sur le modèle des quatre du `09` : `R2_ADMIN_BUCKET` vaut `portfolio-admin-dev` en développement, `portfolio-admin` en production.

---

### Task 2 : Server Actions, en TDD

**Files:**
- Test: `src/server/actions/assets.test.ts`
- Create: `src/server/actions/assets.ts`

**Interfaces:**
- Consomme : `assetUploadSchema`, `isAdminAssetKey` (Task 1), `r2`, `R2_BUCKET`, `adminR2`, `R2_ADMIN_BUCKET`, `validateAssetPath`, `getContentType`, `prisma`.
- Produit : `uploadAsset`, `deleteAsset`, consommées par les Tasks 4 et 5.

- [ ] **Step 1: Écrire les tests qui échouent**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock('@/lib/r2', () => ({
  r2: { send: vi.fn() },
  R2_BUCKET: 'test-bucket',
  adminR2: { send: vi.fn() },
  R2_ADMIN_BUCKET: 'test-admin-bucket',
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findMany: vi.fn(() => []) },
    company: { findMany: vi.fn(() => []) },
  },
}))
vi.mock('@/lib/get-current-user', () => ({ getCurrentUser: vi.fn() }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))


import { prisma } from '@/lib/prisma'
import { adminR2, r2 } from '@/lib/r2'
import { getCurrentUser } from '@/lib/get-current-user'
import { deleteAsset, uploadAsset } from './assets'
import { initialAssetFormState } from './assets.types'

function buildUpload(
  overrides: Record<string, string> = {},
  fileBytes = 1024,
): FormData {
  const data = new FormData()
  const base = { folder: 'projets/client', slug: 'acme', filename: 'cover.webp' }
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    data.set(key, value)
  }
  data.set('file', new File([new Uint8Array(fileBytes)], 'cover.webp'))
  return data
}

describe('uploadAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(r2.send).mockResolvedValue({} as never)
    vi.mocked(adminR2.send).mockResolvedValue({} as never)
  })

  it('refuse une extension hors liste blanche sans appeler R2', async () => {
    const state = await uploadAsset(initialAssetFormState, buildUpload({ filename: 'virus.exe' }))

    expect(state.errors.filename).toBeDefined()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it('refuse un nom de fichier comportant des espaces', async () => {
    const state = await uploadAsset(initialAssetFormState, buildUpload({ filename: 'ma capture.png' }))

    expect(state.errors.filename).toBeDefined()
  })

  it('normalise le nom de fichier en minuscules', async () => {
    await uploadAsset(initialAssetFormState, buildUpload({ filename: 'COVER.WEBP' }))

    expect(r2.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ Key: 'projets/client/acme/cover.webp' }),
      }),
    )
  })

  it('refuse un dossier de destination hors liste', async () => {
    const state = await uploadAsset(initialAssetFormState, buildUpload({ folder: 'etc/passwd' }))

    expect(state.errors.folder).toBeDefined()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it('accepte un dépôt dans branding sans sous-dossier', async () => {
    const data = new FormData()
    data.set('folder', 'branding')
    data.set('filename', 'logo-horizontal-light.png')
    data.set('file', new File([new Uint8Array(1024)], 'logo.png'))

    await uploadAsset(initialAssetFormState, data)

    expect(r2.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ Key: 'branding/logo-horizontal-light.png' }),
      }),
    )
  })

  it('refuse un sous-dossier sur un dossier qui n\'en attend pas', async () => {
    const state = await uploadAsset(
      initialAssetFormState,
      buildUpload({ folder: 'branding', slug: 'quelque-chose' }),
    )

    expect(state.errors.slug).toBeDefined()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it('refuse un dépôt sans sous-dossier sur un dossier qui en attend un', async () => {
    const data = new FormData()
    data.set('folder', 'projets/client')
    data.set('filename', 'cover.webp')
    data.set('file', new File([new Uint8Array(1024)], 'cover.webp'))

    const state = await uploadAsset(initialAssetFormState, data)

    expect(state.errors.slug).toBeDefined()
    expect(r2.send).not.toHaveBeenCalled()
  })

  it('refuse un fichier dépassant la taille maximale', async () => {
    const state = await uploadAsset(initialAssetFormState, buildUpload({}, 9 * 1024 * 1024))

    expect(state.message).toBe('file_too_large')
    expect(r2.send).not.toHaveBeenCalled()
  })

  it('refuse un fichier vide', async () => {
    const state = await uploadAsset(initialAssetFormState, buildUpload({}, 0))

    expect(state.message).toBe('file_empty')
    expect(r2.send).not.toHaveBeenCalled()
  })

  it('refuse un fichier dont le type MIME contredit son extension', async () => {
    const data = new FormData()
    data.set('folder', 'projets/client')
    data.set('slug', 'acme')
    data.set('filename', 'cover.webp')
    data.set('file', new File([new Uint8Array(1024)], 'cover.webp', { type: 'application/pdf' }))

    const state = await uploadAsset(initialAssetFormState, data)

    expect(state.message).toBe('file_type_mismatch')
    expect(r2.send).not.toHaveBeenCalled()
  })

  it('accepte un fichier dont le type MIME est vide', async () => {
    const data = new FormData()
    data.set('folder', 'projets/client')
    data.set('slug', 'acme')
    data.set('filename', 'cover.webp')
    data.set('file', new File([new Uint8Array(1024)], 'cover.webp', { type: '' }))

    const state = await uploadAsset(initialAssetFormState, data)

    expect(state.ok).toBe(true)
    expect(r2.send).toHaveBeenCalled()
  })

  it('compose la clé à partir du dossier, du slug et du nom', async () => {
    await uploadAsset(initialAssetFormState, buildUpload({ slug: 'foyer', filename: 'cover-2.webp' }))

    expect(r2.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ Key: 'projets/client/foyer/cover-2.webp' }),
      }),
    )
  })

  it('écrit un logo d\'entreprise dans portfolio-admin, pas portfolio-assets', async () => {
    await uploadAsset(
      initialAssetFormState,
      buildUpload({ folder: 'freelance/crm/entreprises', slug: 'foyer', filename: 'logo.png' }),
    )

    expect(adminR2.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ Bucket: 'test-admin-bucket', Key: 'freelance/crm/entreprises/foyer/logo.png' }),
      }),
    )
    expect(r2.send).not.toHaveBeenCalled()
  })

  it('refuse un appel sans session, avant toute validation', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    await expect(uploadAsset(initialAssetFormState, buildUpload())).rejects.toThrow()

    expect(r2.send).not.toHaveBeenCalled()
  })
})

describe('deleteAsset', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(r2.send).mockResolvedValue({} as never)
    vi.mocked(adminR2.send).mockResolvedValue({} as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.company.findMany).mockResolvedValue([] as never)
  })

  it('supprime un asset libre', async () => {
    const state = await deleteAsset('projets/client/acme/cover.webp')

    expect(state.ok).toBe(true)
    expect(r2.send).toHaveBeenCalled()
  })

  it('supprime un logo d\'entreprise via adminR2, sur portfolio-admin', async () => {
    const state = await deleteAsset('freelance/crm/entreprises/foyer/logo.png')

    expect(state.ok).toBe(true)
    expect(adminR2.send).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ Bucket: 'test-admin-bucket' }) }),
    )
    expect(r2.send).not.toHaveBeenCalled()
  })

  it('refuse la suppression et nomme le projet qui utilise la couverture', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ slug: 'foyer' }] as never)

    const state = await deleteAsset('projets/client/foyer/cover.webp')

    expect(state.ok).toBe(false)
    expect(state.message).toBe('asset_in_use')
    expect(state.usedBy).toContain('foyer')
    expect(r2.send).not.toHaveBeenCalled()
  })

  it("refuse la suppression et nomme l'entreprise qui utilise le logo", async () => {
    vi.mocked(prisma.company.findMany).mockResolvedValue([{ slug: 'dentsu' }] as never)

    const state = await deleteAsset('freelance/crm/entreprises/dentsu/logo.png')

    expect(state.message).toBe('asset_in_use')
    expect(state.usedBy).toContain('dentsu')
    expect(adminR2.send).not.toHaveBeenCalled()
  })
})
```

Le point commun des cas de refus est `expect(r2.send).not.toHaveBeenCalled()` : toute validation doit précéder l'appel réseau, aussi bien pour ne pas écrire de fichier invalide que pour ne pas consommer d'opération facturée.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run --project unit src/server/actions/assets.test.ts`
Expected: FAIL, le module `./assets` n'existe pas.

- [ ] **Step 3: Écrire les Server Actions**

```typescript
'use server'

import 'server-only'
import { DeleteObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { revalidatePath } from 'next/cache'

import { z } from 'zod'

import { getCurrentUser } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'
import { adminR2, r2, R2_ADMIN_BUCKET, R2_BUCKET } from '@/lib/r2'
import { assetUploadSchema, buildAssetKey, isAdminAssetKey, MAX_ASSET_BYTES } from '@/lib/schemas/asset'
import { createActionLogger } from '@/lib/server-utils'
import { getContentType, validateAssetPath } from '@/server/config/assets'

import { type AssetFormState } from './assets.types'

type ZodFieldErrors = AssetFormState['errors']

function resolveBucket(key: string): { client: typeof r2; bucket: string } {
  return isAdminAssetKey(key)
    ? { client: adminR2, bucket: R2_ADMIN_BUCKET }
    : { client: r2, bucket: R2_BUCKET }
}

export async function uploadAsset(
  _prevState: AssetFormState,
  formData: FormData,
): Promise<AssetFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('uploadAsset')

  const result = assetUploadSchema.safeParse({
    folder: formData.get('folder') ?? '',
    slug: formData.get('slug') ?? '',
    filename: formData.get('filename') ?? '',
  })
  if (!result.success) {
    return {
      ok: false,
      errors: z.flattenError(result.error).fieldErrors as ZodFieldErrors,
      message: null,
    }
  }

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, errors: {}, message: 'file_empty' }
  }
  if (file.size > MAX_ASSET_BYTES) {
    return { ok: false, errors: {}, message: 'file_too_large' }
  }

  const key = buildAssetKey(result.data)

  // La clé doit franchir la même validation que la lecture : écrire un objet
  // que la route refuserait de servir le rendrait inaccessible tout en occupant de l'espace.
  const validation = validateAssetPath(key.split('/'))
  if (!validation.ok) {
    return { ok: false, errors: { filename: [validation.error] }, message: null }
  }

  // Un type vide est toléré : certains navigateurs ne le renseignent pas. Un type
  // renseigné mais incohérent avec l'extension trahit un fichier renommé.
  const expectedType = getContentType(key)
  if (file.type && file.type !== expectedType) {
    return { ok: false, errors: {}, message: 'file_type_mismatch' }
  }

  const { client, bucket } = resolveBucket(key)

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: getContentType(key),
      }),
    )
    revalidatePath('/admin/assets')
    log.info({ event: 'asset:uploaded', key, size: file.size })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    log.error({ err, event: 'asset:upload_failed', key })
    return { ok: false, errors: {}, message: 'unknown_error' }
  }
}

export async function deleteAsset(key: string): Promise<AssetFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('deleteAsset')
  const filename = key.split('/').pop() ?? ''

  const [projects, companies] = await Promise.all([
    prisma.project.findMany({
      where: {
        OR: [
          { coverFilename: key },
          { caseStudyMarkdownFr: { contains: key } },
          { caseStudyMarkdownEn: { contains: key } },
        ],
      },
      select: { slug: true },
    }),
    prisma.company.findMany({ where: { logoFilename: key }, select: { slug: true } }),
  ])

  const usedBy = [...projects.map((p) => p.slug), ...companies.map((c) => c.slug)]
  if (usedBy.length > 0) {
    return { ok: false, errors: {}, message: 'asset_in_use', usedBy }
  }

  const { client, bucket } = resolveBucket(key)

  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }))
    revalidatePath('/admin/assets')
    log.info({ event: 'asset:deleted', key, filename })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    log.error({ err, event: 'asset:delete_failed', key })
    return { ok: false, errors: {}, message: 'unknown_error' }
  }
}
```

`await getCurrentUser()` ouvre les deux actions, hors du `try`. C'est d'autant plus nécessaire ici que `uploadAsset` écrit dans un bucket : sans garde, une requête forgée pourrait y déposer un fichier arbitraire dans la limite des extensions autorisées.

La vérification des rattachements précède la suppression et non l'inverse : consulter la base après avoir effacé l'objet ne servirait à rien.

**Un asset est référencé de trois façons, pas deux.** Les deux colonnes sont des égalités faciles. Mais les captures de case study ne vivent dans aucune colonne dédiée : elles sont écrites en dur dans `caseStudyMarkdownFr` et `caseStudyMarkdownEn`, et rendues par `MarkdownContent`. Sans les deux `contains`, on supprime une image pourtant affichée sur une page publique, et le défaut ne se voit qu'à l'œil, plus tard, sur la page de case study concernée. C'est le trou le plus discret de cet écran.

Le format exact stocké dans `coverFilename` et `logoFilename` doit être confirmé à l'implémentation. Si ces colonnes portent le nom seul et non la clé complète, la clause `where` doit s'y adapter, sans quoi la protection ne détecterait jamais rien.

`resolveBucket` déduit le bucket et le client de la clé, via `isAdminAssetKey` : `freelance/crm/entreprises/…` va sur `portfolio-admin` avec `adminR2`, tout le reste sur `portfolio-assets` avec `r2`. Un `R2_BUCKET` figé aurait supprimé ou écrit dans le mauvais bucket, ou plus exactement n'aurait rien fait, sans erreur, le token de la vitrine ne voyant pas `portfolio-admin`.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run --project unit src/server/actions/assets.test.ts`
Expected: PASS, dix-huit cas verts.

---

### Task 3 : Listing paginé et lecture authentifiée du bucket admin

**Files:**
- Create: `src/server/queries/assets.ts`
- Create: `src/server/queries/assets.test.ts`
- Create: `src/app/admin/(protected)/api/assets/[...path]/route.ts`

**Interfaces:**
- Consomme : `r2`, `R2_BUCKET`, `adminR2`, `R2_ADMIN_BUCKET` (Task 1), `getCurrentUser`, `validateAssetPath`, `getContentType`.
- Produit : `listAssets(prefix?: string)` et `listAdminAssets(prefix?: string)`, consommées par les Tasks 4 et 5 ; la route authentifiée, consommée par l'`AssetPicker` de la carte Logo pour ses vignettes.

- [ ] **Step 1: Écrire le listing**

```typescript
import 'server-only'
import { ListObjectsV2Command, type S3Client } from '@aws-sdk/client-s3'

import { adminR2, r2, R2_ADMIN_BUCKET, R2_BUCKET } from '@/lib/r2'

export type AssetEntry = { key: string; size: number; lastModified?: Date }

async function listBucket(client: S3Client, bucket: string, prefix?: string): Promise<AssetEntry[]> {
  const entries: AssetEntry[] = []
  let continuationToken: string | undefined

  do {
    const page = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    )

    for (const object of page.Contents ?? []) {
      if (object.Key) {
        entries.push({
          key: object.Key,
          size: object.Size ?? 0,
          lastModified: object.LastModified,
        })
      }
    }

    continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (continuationToken)

  return entries
}

export async function listAssets(prefix?: string): Promise<AssetEntry[]> {
  const entries = await listBucket(r2, R2_BUCKET, prefix)
  return entries.sort((a, b) => a.key.localeCompare(b.key))
}

export async function listAdminAssets(prefix?: string): Promise<AssetEntry[]> {
  const entries = await listBucket(adminR2, R2_ADMIN_BUCKET, prefix)
  return entries.sort((a, b) => a.key.localeCompare(b.key))
}
```

La boucle sur le jeton de continuation n'est pas de l'anticipation : sans elle, la liste s'arrêterait à mille objets **en paraissant complète**. C'est le genre de défaut qui n'apparaît que le jour où il est coûteux. `listBucket` factorise la boucle entre les deux buckets : seuls le client et le nom du bucket changent, la logique de pagination ne doit pas être écrite deux fois.

- [ ] **Step 2: Écrire le test de pagination**

Un seul cas, et c'est le seul de ce sub-project qui vérifie la boucle elle-même. Mocker `@/lib/r2` et faire renvoyer à `r2.send` deux réponses successives : la première `{ Contents: [{ Key: 'a' }], IsTruncated: true, NextContinuationToken: 't' }`, la seconde `{ Contents: [{ Key: 'b' }], IsTruncated: false }`. Assertions : `listAssets()` retourne deux entrées, et `r2.send` a été appelée deux fois, la seconde avec `ContinuationToken: 't'`.

```bash
pnpm vitest run --project unit src/server/queries/assets.test.ts
```

Expected: PASS, un cas vert. Sans ce test, une régression sur la boucle rend la liste silencieusement tronquée, ce que le scénario 7 de la spec ne détecterait qu'au-delà de mille objets.

- [ ] **Step 3: Écrire la route authentifiée du bucket admin**

`portfolio-admin` n'a pas de route publique : les vignettes de l'`AssetPicker` sur la carte Logo (`<img src="...">`) passent par une route sous `/admin`, gardée comme le reste de l'arbre. Même mécanique que la route publique du `09` (validation, `GetObjectCommand`, flux, `NoSuchKey` en 404), avec deux différences : le client et le bucket admin, et une garde de session en tête.

```typescript
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { NextResponse } from 'next/server'

import { getCurrentUser } from '@/lib/get-current-user'
import { adminR2, R2_ADMIN_BUCKET } from '@/lib/r2'
import { getContentType, validateAssetPath } from '@/server/config/assets'

type RouteContext = { params: Promise<{ path: string[] }> }

export async function GET(_request: Request, context: RouteContext): Promise<Response> {
  await getCurrentUser()

  const { path: raw } = await context.params
  const validation = validateAssetPath(raw)
  if (!validation.ok) {
    return NextResponse.json({ error: validation.error }, { status: 400 })
  }

  try {
    const object = await adminR2.send(
      new GetObjectCommand({ Bucket: R2_ADMIN_BUCKET, Key: validation.joined }),
    )
    if (!object.Body) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return new Response(object.Body.transformToWebStream(), {
      status: 200,
      headers: { 'Content-Type': getContentType(validation.joined) },
    })
  } catch (err) {
    if ((err as { name?: string }).name === 'NoSuchKey') {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    throw err
  }
}
```

`await getCurrentUser()` précède tout : cette route sert un bucket qui n'a pas d'autre protection que la session, contrairement à `portfolio-assets` dont la seule garde est de ne rien exposer de sensible. Pas de `Cache-Control` immuable ici : ce n'est pas la vitrine, et un logo remplacé doit apparaître sans attendre l'expiration d'un cache d'un an.

- [ ] **Step 4: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur.

---

### Task 4 : Sélecteur réutilisable

**Files:**
- Create: `src/components/features/admin/assets/AssetPicker.tsx`

**Interfaces:**
- Consomme : rien côté serveur. `listAssets` et `listAdminAssets` portent `import 'server-only'` : un composant client ne peut pas les importer, c'est le parent Server Component qui appelle la requête et passe le résultat en prop.
- Produit : `<AssetPicker value={string | null} onChange={(key: string | null) => void} assets={AssetEntry[]} imageBasePath={string} />`, consommé dès ce sub-project par la carte Logo du formulaire entreprise (`imageBasePath="/admin/api/assets"`, assets de `listAdminAssets('freelance/crm/entreprises')`), puis par le sub-project `13` pour la couverture de projet (`imageBasePath="/api/assets"`, assets de `listAssets('projets')`). Le filtrage par préfixe est fait par l'appelant, au moment de la requête.

- [ ] **Step 1: Écrire le sélecteur**

Composant client affichant les assets d'un préfixe sous forme de vignettes sélectionnables, avec une option de retrait. Points imposés :

- il reçoit et renvoie une **clé d'objet**, jamais un fichier
- les vignettes s'affichent via `${imageBasePath}/<clé>` : `/api/assets` pour `portfolio-assets`, la route authentifiée de la Task 3 pour `portfolio-admin`. Le composant ne choisit pas le bucket, il affiche ce que l'appelant lui a résolu
- une option permet de revenir à l'absence de sélection, `coverFilename` et `logoFilename` étant nullables
- le préfixe restreint la liste au dossier pertinent, pour ne pas proposer un CV comme couverture de projet
- la grille suit des paliers fixes propres à la modale : `grid-cols-2` par défaut, `sm:grid-cols-3`, `md:grid-cols-4`. Distincts des paliers de l'écran Assets (Task 5, une colonne par défaut jusqu'à cinq dès `xl`) : cette grille compose des vignettes plus petites dans une modale, pas la surface pleine largeur de la page
- une vignette est **sélectionnable, donc cliquable** : elle porte `transition duration-300 ease-out hover:scale-[1.01] hover:shadow-xl`, l'affordance de survol des surfaces cliquables custom. Ne pas écrire de `hover:border-*` : la `Card` shadcn en `radix-nova` dessine son contour par `ring-1 ring-foreground/10` et sa bordure fait 0px, la classe n'aurait aucun effet visible

- [ ] **Step 2: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 5 : Écran de gestion

**Files:**
- Create: `src/components/features/admin/assets/AssetsBrowser.tsx`
- Create: `src/components/features/admin/assets/AssetUploadDialog.tsx`
- Create: `src/components/features/admin/assets/DeleteAssetDialog.tsx`
- Modify: `src/app/admin/(protected)/assets/page.tsx`

**Interfaces:**
- Consomme : `uploadAsset`, `deleteAsset` (Task 2), `listAssets`, `listAdminAssets` (Task 3).
- Produit : l'écran `/admin/assets` complet.

- [ ] **Step 1: Écrire la modale de dépôt**

Composant client en `useActionState`. Points imposés :

- un select du dossier alimenté par `ASSET_FOLDERS` (cinq entrées, `freelance/crm/entreprises` comprise), un champ de slug, un champ de fichier
- soumission par `onSubmit` + `startTransition(() => formAction(new FormData(event.currentTarget)))` après `event.preventDefault()`, jamais par `<form action>` : le `Select` de dossier perdrait sa valeur au premier reset après une erreur de validation, comme `TagFormDialog` (`.claude/rules/shadcn-ui/components.md`)
- le texte d'aide de la zone de dépôt énumère toutes les extensions réellement acceptées : « JPG, PNG, WebP, SVG ou PDF · 8 Mo maximum », dérivées de `CONTENT_TYPE_MAP`, pas une liste recopiée à la main qui pourrait diverger
- le nom du fichier est pré-rempli depuis le fichier choisi, en minuscules, et reste modifiable
- **la taille est vérifiée côté client avant l'envoi** : au-delà de `bodySizeLimit`, la requête est rejetée par le framework avant d'atteindre l'action, et le message par défaut n'explique rien
- si la clé existe déjà dans le listing, un avertissement `text-sm text-destructive` apparaît dans le corps de la modale, sans `Alert`, et le bouton « Déposer » exige une seconde confirmation avant d'envoyer, R2 écrasant sans avertir

- [ ] **Step 2: Écrire la confirmation de suppression**

`AlertDialog` appelant `deleteAsset(key)`. Quand `state.message` vaut `asset_in_use`, le texte de la modale est remplacé dès l'ouverture par le refus en `text-destructive`, sur le gabarit « Ce fichier est [la couverture de / le logo de / cité dans le case study de] « {{ nom }} ». Retirez le rattachement avant de le supprimer. », `{{ nom }}` venant du premier élément de `state.usedBy`. Le bouton `Annuler` reste, `Supprimer` est désactivé plutôt que retiré : même motif que `dlgDeleteTag` et `dlgDeleteCompany`, pas le pied à bouton unique `Fermer` que la maquette dessine pour ce cas précis.

- [ ] **Step 3: Écrire le navigateur d'assets**

Grille plate, filtrée par une facette « Dossier » (checkboxes à compteurs, sur le motif du `07`), jamais une liste groupée par préfixe : aucune ligne de section ne sépare les dossiers. Chaque tuile montre la vignette, le nom du fichier, le dossier (tronqué, relu en `Tooltip`), la taille, une action « copier le chemin » (`/api/assets/<clé>` ou l'équivalent admin) et une action de suppression. Aucune date de modification ne s'affiche.

La grille suit des paliers fixes, pas les paliers de `docs/DESIGN.md` utilisés par l'`AssetPicker` : une colonne par défaut, deux dès `sm`, trois dès `md`, quatre dès `lg`, cinq dès `xl`, pour des tuiles d'environ 200px. Ces entrées ne sont pas cliquables, l'action vivant dans les deux icônes de la tuile : elles ne portent donc pas le survol des surfaces cliquables de l'`AssetPicker`.

Le pied de la grille porte un compteur (« N fichiers · résumé des facettes ») et une `Pagination`, sans sélecteur « lignes par page » : ce n'est pas un `DataTable`.

- [ ] **Step 4: Remplacer la page d'attente**

**Le chargement passe sous `<Suspense>`.** `listAssets` et `listAdminAssets` lisent R2 sans cache, or `cacheComponents: true` refuse une lecture dynamique qui n'est ni cachée ni suspendue : elle lève `"Uncached data was accessed outside of <Suspense>"` et fait échouer le build. Extraire un sous-composant `async` qui appelle les deux requêtes et rend le dépôt et le navigateur, le monter dans un `<Suspense>` avec un `StackedSkeleton` en `fallback`, et laisser la page elle-même statique. `src/app/[locale]/(public)/projets/[slug]/page.tsx` en donne la forme exacte, à relire avant d'écrire. Le bloc ci-dessous montre le chargement, pas la structure finale de la page.

**La grille combine les deux buckets.** La facette « Dossier » propose les cinq entrées d'`ASSET_FOLDERS`, `freelance/crm/entreprises` comprise : sans les assets admin dans le listing, ce dossier de la facette n'afficherait jamais rien après un dépôt. Chaque entrée porte son `imageBasePath` pour que `AssetsBrowser` sache résoudre sa vignette et son action copier-le-chemin sans deviner le bucket depuis la clé.

```typescript
import { AssetsBrowser } from '@/components/features/admin/assets/AssetsBrowser'
import { AssetUploadDialog } from '@/components/features/admin/assets/AssetUploadDialog'
import { listAdminAssets, listAssets } from '@/server/queries/assets'

export default async function AdminAssetsPage() {
  const [assets, adminAssets] = await Promise.all([
    listAssets(),
    listAdminAssets('freelance/crm/entreprises'),
  ])
  const allAssets = [
    ...assets.map((a) => ({ ...a, imageBasePath: '/api/assets' })),
    ...adminAssets.map((a) => ({ ...a, imageBasePath: '/admin/api/assets' })),
  ]

  return (
    <div className="w-full py-6 lg:py-8">
      <div className="flex items-center justify-between">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">Assets</h1>
        <AssetUploadDialog existingKeys={allAssets.map((a) => a.key)} />
      </div>
      <div className="mt-6">
        <AssetsBrowser assets={allAssets} />
      </div>
    </div>
  )
}
```

`existingKeys` est ce qui permet à la modale de détecter un écrasement avant l'envoi, tous buckets confondus : une clé donnée n'existe que dans un seul des deux.

Deux points de style sont imposés par `docs/DESIGN.md` et ne s'improvisent pas :

- **`font-sans` sur le `h1`.** `globals.css` applique en `@layer base` `h1 { @apply font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl }`. Une classe utilitaire écrase la taille et la graisse, jamais la famille : sans `font-sans`, ce titre rendrait en Sansation à 600, une graisse qui n'est pas chargée (`Sansation` est déclarée en `['700']` seul). Le `tracking-tight` hérité est en revanche conservé : l'écran admin reprend le réglage H3 tel quel, 24px en 600, comme `docs/DESIGN.md` le prescrit. Les pages internes de l'admin gardent Geist Sans.
- **`w-full py-6 lg:py-8` sur le conteneur.** Le container admin occupe la pleine largeur restante après la sidebar, sans `max-w-7xl` centré, et son rythme vertical est resserré : la densité prime sur le souffle.

- [ ] **Step 5: Vérifier que tout compile**

```bash
just typecheck && just lint && just build
```

Expected: aucune erreur.

---

### Task 6 : Vérifier de bout en bout

**Files:** aucun fichier du dépôt.

- [ ] **Step 1: Vérifier le format des colonnes de référence**

```sql
SELECT "coverFilename" FROM "Project" WHERE "coverFilename" IS NOT NULL LIMIT 3;
SELECT "logoFilename" FROM "Company" WHERE "logoFilename" IS NOT NULL LIMIT 3;
```

Comparer avec le format de clé produit par l'upload. Si ces colonnes portent le nom seul et non la clé complète, adapter la clause `where` de `deleteAsset` : sans cela, la protection ne détecterait jamais aucun rattachement et laisserait supprimer des assets utilisés.

- [ ] **Step 2: Déposer une image**

Depuis `/admin/assets`, déposer une image dans un dossier de projet.

Expected: elle apparaît dans le listing, et son URL `/api/assets/...` la sert correctement.

- [ ] **Step 3: Vérifier le refus d'une extension**

Tenter de déposer un fichier `.txt`.

Expected: refus, avec la liste des extensions acceptées.

- [ ] **Step 4: Vérifier le refus d'un fichier trop volumineux**

Tenter de déposer un fichier de plus de 8 Mo.

Expected: un message explicite venant de la vérification côté client, et non l'erreur brute du framework.

- [ ] **Step 5: Vérifier le refus d'un type incohérent**

Renommer un PDF en `.webp`, puis tenter de le déposer.

Expected: refus. Le navigateur annonce `application/pdf` alors que l'extension attend `image/webp`, et l'écart est détecté avant l'écriture.

- [ ] **Step 6: Vérifier l'avertissement d'écrasement**

Redéposer un fichier portant exactement la même clé qu'un asset existant.

Expected: une confirmation est demandée avant l'envoi.

- [ ] **Step 7: Vérifier la suppression d'un asset libre**

Expected: il disparaît du listing et du bucket.

- [ ] **Step 8: Vérifier le refus de suppression d'un asset référencé**

Rattacher un asset à un projet, puis tenter de le supprimer.

Expected: refus, avec le slug du projet nommé. C'est le critère central du sub-project.

- [ ] **Step 8 bis: Vérifier le refus sur une capture de case study**

Repérer une image citée dans le markdown d'un case study sans être la couverture du projet, par exemple `projets/client/webapp-gestion-sinistres/webapp-gestion-sinistres-2.webp`, puis tenter de la supprimer.

Expected: refus, avec le slug du projet nommé. Une suppression acceptée signalerait que les deux clauses `contains` sur `caseStudyMarkdownFr` et `caseStudyMarkdownEn` manquent : l'image disparaîtrait d'une page publique sans que rien ne le signale.

- [ ] **Step 9: Vérifier le bucket de destination**

```bash
AWS_ACCESS_KEY_ID=<clé dev> AWS_SECRET_ACCESS_KEY=<secret dev> AWS_DEFAULT_REGION=auto \
  aws s3 ls s3://portfolio-assets-dev/ --recursive \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com | tail -5
```

Expected: le fichier déposé en local est dans le bucket de développement, pas dans celui de production. Le token de développement ne peut de toute façon pas lire `portfolio-assets` : tenter la même commande sur ce bucket doit être refusé.

- [ ] **Step 9 bis: Vérifier la séparation vitrine / back-office**

Déposer un logo dans l'emplacement `freelance/crm/entreprises`, avec un slug d'entreprise.

```bash
aws s3 ls s3://portfolio-admin-dev/freelance/crm/entreprises/ --recursive \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com
```

Expected: le fichier est dans le bucket **admin**, pas dans celui de la vitrine. Puis :

- le charger par la route publique `/api/assets/freelance/crm/entreprises/<slug>/logo.png` doit échouer, cette route ne détenant que le token de la vitrine ;
- le charger par la route authentifiée de l'espace admin, session valide, doit réussir.

C'est ce qui prouve que la frontière posée au sub-project `09` tient jusqu'à l'écriture.

- [ ] **Step 9 ter: Vérifier la sélection du logo depuis le formulaire entreprise**

Depuis le formulaire entreprise, cliquer sur « Choisir un logo ».

Expected: le sélecteur s'ouvre sur `freelance/crm/entreprises/`, ses vignettes se chargent par la route authentifiée (pas `/api/assets/...`), le logo choisi s'affiche dans l'aperçu de la carte, et la grille de l'écran `/admin/assets` propose bien le dossier « freelance/crm/entreprises » dans sa facette Dossier une fois le fichier déposé.

- [ ] **Step 10: Lancer la suite complète**

```bash
just test
```

Expected: tous les tests verts.

---

### Task 7 : Mettre la documentation à jour

**Files:**
- Modify: `.claude/rules/nextjs/assets.md`
- Modify: `docs/PRODUCTION.md`

**Interfaces:**
- Consomme : la configuration réelle et vérifiée des Tasks 1 à 6.
- Produit : deux documents alignés sur ce que l'écran accepte réellement.

- [ ] **Step 1: Documenter le dossier `branding/` dans la rule des assets**

`.claude/rules/nextjs/assets.md` ne décrit que `projets/` et `documents/`. Le dossier `branding/` est pourtant utilisé en production par le logo de la navbar, le portrait de la page à propos et le JSON-LD, avec une profondeur de deux segments et **sans** slug intermédiaire.

Ajouter les quatre structures valides à la règle de convention de chemins, en nommant le bucket de chacune :

| Bucket | Structure | Segments | Exemple |
|---|---|---|---|
| `portfolio-assets` | `branding/<fichier>` | 2 | `branding/portrait.jpg` |
| `portfolio-assets` | `documents/cv/<fichier>` | 3 | `documents/cv/cv-thibaud-geisler-fr.pdf` |
| `portfolio-assets` | `projets/{client,personal}/<slug-projet>/<fichier>` | 4 | `projets/client/webapp-gestion-sinistres/cover.webp` |
| `portfolio-admin` | `freelance/crm/entreprises/<slug>/<fichier>` | 5 | `freelance/crm/entreprises/foyer/logo.png` |

Écrire aussi la règle qui les sépare, sans quoi la table se lit comme une liste arbitraire : `portfolio-assets` porte ce que la route publique `/api/assets/[...path]` sert sans authentification, `portfolio-admin` ce qui n'est lu que par l'espace admin, derrière sa propre route gardée. Le critère n'est pas « qui édite le fichier », l'admin écrivant dans les deux, mais « qui a le droit de le lire ».

Le dossier de projet porte le slug du **projet**, jamais celui de son entreprise : c'est ce que le sub-project `09` a corrigé, l'ancienne arborescence mélangeant les deux conventions.

Sans cet ajout, la rule décrit `branding/` comme interdit alors qu'il est en place, et c'est elle qui est chargée automatiquement à la prochaine édition d'un fichier d'assets. C'est aussi ce constat d'arborescence qui justifie les trois contrôles du formulaire de la Task 1, emplacement, slug et nom de fichier : le documenter ailleurs que dans le plan est ce qui empêche qu'on le « corrige » plus tard en croyant à une incohérence.

- [ ] **Step 2: Consigner la limite de taille dans `docs/PRODUCTION.md`**

Ajouter la limite retenue là où les contraintes d'exploitation sont documentées : `serverActions.bodySizeLimit` est relevée à **8 Mo** pour le dépôt d'assets depuis l'espace admin, contre 1 Mo par défaut.

Préciser le raisonnement en une ligne, la valeur seule n'expliquant pas pourquoi elle a été choisie : la limite porte sur le corps HTTP brut, overhead multipart compris, et le plus gros cas réaliste est une capture PNG non optimisée de 1 à 3 Mo. Mentionner que la mise en garde de Next sur la consommation de ressources ne s'applique pas ici, l'action étant derrière l'authentification et joignable par le seul compte autorisé.

Ajouter aussi les trois variables du bucket admin (`R2_ADMIN_ACCESS_KEY_ID`, `R2_ADMIN_SECRET_ACCESS_KEY`, `R2_ADMIN_BUCKET`) aux Variables Secrets, à côté des quatre `R2_*` posées par le `09`, et `R2_ADMIN_SECRET_ACCESS_KEY` à la liste des secrets à ne jamais logger.

- [ ] **Step 3: Vérifier qu'aucune des deux structures ne contredit le code**

```bash
grep -rn "branding" .claude/rules/nextjs/assets.md src/lib/schemas/asset.ts
grep -rn "entreprises" .claude/rules/nextjs/assets.md src/lib/schemas/asset.ts
```

Expected: les deux emplacements apparaissent des deux côtés, avec la même profondeur, la même règle de slug et le même bucket.

- [ ] **Step 4: Inscrire la vérification de production dans la Checklist Release**

Un point ne peut être constaté qu'après déploiement, et la production ne se déploie qu'au tag release-please : l'ajouter à la Checklist Release de `docs/PRODUCTION.md` plutôt qu'en faire un critère de fin de sub-project. Un fichier déposé depuis l'espace admin de production apparaît dans le bucket de production correspondant à son emplacement, et un logo d'entreprise reste inaccessible par la route publique.

- [ ] **Step 5: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): gestion des assets avec upload vers R2
```
