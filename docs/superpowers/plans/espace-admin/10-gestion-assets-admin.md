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
- Les clés suivent la convention existante : `projets/{client,personal}/<slug>/<filename>` et `documents/<slug>/<filename>`.
- Le chemin complet passe par **`validateAssetPath`** avant écriture : un fichier qu'on ne pourrait pas relire n'a aucune raison d'être écrit.
- **Taille et type MIME sont vérifiés côté serveur**, `.claude/rules/nextjs/server-actions.md` l'imposant explicitement : « valider taille et type MIME des fichiers `FormData` côté serveur, ne pas se fier au `accept` HTML ». Le MIME annoncé doit correspondre à l'extension, faute de quoi un `.png` renommé serait servi plus tard avec un `Content-Type` qui ne décrit pas son contenu.
- La suppression est **refusée** si l'asset est référencé par `Project.coverFilename` ou `Company.logoFilename`, et le message nomme les éléments concernés.
- Le listing suit le **jeton de continuation** : `ListObjectsV2` plafonne à mille objets par appel.
- R2 **écrase sans avertir** un objet de même clé : l'écrasement doit être confirmé explicitement.
- Aucun modèle Prisma ajouté. L'ADR-011 pose que « les assets binaires ne sont pas modélisés en BDD ».
- Les dépôts locaux vont dans `portfolio-assets-dev`, la production dans `portfolio-assets`.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/nextjs/assets.md`, `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/validation.md`, `.claude/rules/nextjs/configuration.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/vitest/setup.md`.

---

### Task 1 : Configuration et schéma

**Files:**
- Modify: `next.config.ts`
- Create: `src/lib/schemas/asset.ts`
- Create: `src/server/actions/assets.types.ts`

**Interfaces:**
- Consomme : `CONTENT_TYPE_MAP` de `src/server/config/assets.ts`.
- Produit : `assetUploadSchema`, `ASSET_FOLDERS`, `MAX_ASSET_BYTES`, `AssetFormState`, consommés par la Task 2.

- [ ] **Step 1: Relever la limite de taille**

Dans `next.config.ts`, compléter le bloc `experimental` existant :

```typescript
  experimental: {
    authInterrupts: true,
    taint: true,
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
```

Les deux premiers drapeaux viennent du sub-project `05` : les conserver.

- [ ] **Step 2: Écrire le schéma de dépôt**

```typescript
import { z } from 'zod'

import { CONTENT_TYPE_MAP } from '@/server/config/assets'

export const MAX_ASSET_BYTES = 8 * 1024 * 1024

// L'arborescence réelle porte trois profondeurs, relevées dans le dossier assets/ :
//   branding/<fichier>                            → logos et portrait
//   documents/<slug>/<fichier>                    → CV et documents publics
//   projets/{client,personal}/<slug>/<fichier>    → couvertures et logos de projets
export const FOLDERS_WITH_SLUG = ['projets/client', 'projets/personal', 'documents'] as const
export const FOLDERS_WITHOUT_SLUG = ['branding'] as const
export const ASSET_FOLDERS = [...FOLDERS_WITH_SLUG, ...FOLDERS_WITHOUT_SLUG] as const

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

Le slug est **conditionnel** : `branding/` reçoit ses fichiers directement, alors que `projets/client` et `documents` attendent un sous-dossier. Cette asymétrie n'est pas un choix mais un constat de l'arborescence existante, où `branding/portrait.jpg` voisine avec `documents/cv/cv-thibaud-geisler-fr.pdf`. Un schéma imposant un slug partout rendrait impossible le dépôt d'un logo de marque.

`buildAssetKey` centralise la composition de la clé pour que la règle du slug conditionnel ne soit écrite qu'une fois.

`ASSET_FOLDERS` reste une liste fermée plutôt qu'un chemin libre : c'est ce qui empêche l'arborescence de diverger de ce que la route sait servir. La liste d'extensions est dérivée de `CONTENT_TYPE_MAP`, donc écriture et lecture ne peuvent pas diverger.

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

---

### Task 2 : Server Actions, en TDD

**Files:**
- Test: `src/server/actions/assets.test.ts`
- Create: `src/server/actions/assets.ts`

**Interfaces:**
- Consomme : `assetUploadSchema` (Task 1), `r2`, `R2_BUCKET`, `validateAssetPath`, `getContentType`, `prisma`.
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
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    project: { findMany: vi.fn(() => []) },
    company: { findMany: vi.fn(() => []) },
  },
}))
vi.mock('@/lib/get-current-user', () => ({ getCurrentUser: vi.fn() }))


import { prisma } from '@/lib/prisma'
import { r2 } from '@/lib/r2'
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

  it('compose la clé à partir du dossier, du slug et du nom', async () => {
    await uploadAsset(initialAssetFormState, buildUpload({ slug: 'foyer', filename: 'logo.png' }))

    expect(r2.send).toHaveBeenCalledWith(
      expect.objectContaining({
        input: expect.objectContaining({ Key: 'projets/client/foyer/logo.png' }),
      }),
    )
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
    vi.mocked(prisma.project.findMany).mockResolvedValue([] as never)
    vi.mocked(prisma.company.findMany).mockResolvedValue([] as never)
  })

  it('supprime un asset libre', async () => {
    const state = await deleteAsset('projets/client/acme/cover.webp')

    expect(state.ok).toBe(true)
    expect(r2.send).toHaveBeenCalled()
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

    const state = await deleteAsset('projets/client/dentsu/logo.png')

    expect(state.message).toBe('asset_in_use')
    expect(state.usedBy).toContain('dentsu')
    expect(r2.send).not.toHaveBeenCalled()
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

import { getCurrentUser } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'
import { r2, R2_BUCKET } from '@/lib/r2'
import { assetUploadSchema, buildAssetKey, MAX_ASSET_BYTES } from '@/lib/schemas/asset'
import { createActionLogger } from '@/lib/server-utils'
import { getContentType, validateAssetPath } from '@/server/config/assets'

import { type AssetFormState } from './assets.types'

type ZodFieldErrors = AssetFormState['errors']

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
      errors: result.error.flatten().fieldErrors as ZodFieldErrors,
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

  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: Buffer.from(await file.arrayBuffer()),
        ContentType: getContentType(key),
      }),
    )
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
    prisma.project.findMany({ where: { coverFilename: key }, select: { slug: true } }),
    prisma.company.findMany({ where: { logoFilename: key }, select: { slug: true } }),
  ])

  const usedBy = [...projects.map((p) => p.slug), ...companies.map((c) => c.slug)]
  if (usedBy.length > 0) {
    return { ok: false, errors: {}, message: 'asset_in_use', usedBy }
  }

  try {
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }))
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

Le format exact stocké dans `coverFilename` et `logoFilename` doit être confirmé à l'implémentation. Si ces colonnes portent le nom seul et non la clé complète, la clause `where` doit s'y adapter, sans quoi la protection ne détecterait jamais rien.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run --project unit src/server/actions/assets.test.ts`
Expected: PASS, quinze cas verts.

---

### Task 3 : Listing paginé

**Files:**
- Create: `src/server/queries/assets.ts`

**Interfaces:**
- Consomme : `r2`, `R2_BUCKET`.
- Produit : `listAssets(prefix?: string)`, consommée par les Tasks 4 et 5.

- [ ] **Step 1: Écrire le listing**

```typescript
import 'server-only'
import { ListObjectsV2Command } from '@aws-sdk/client-s3'

import { r2, R2_BUCKET } from '@/lib/r2'

export type AssetEntry = { key: string; size: number; lastModified?: Date }

export async function listAssets(prefix?: string): Promise<AssetEntry[]> {
  const entries: AssetEntry[] = []
  let continuationToken: string | undefined

  do {
    const page = await r2.send(
      new ListObjectsV2Command({
        Bucket: R2_BUCKET,
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

  return entries.sort((a, b) => a.key.localeCompare(b.key))
}
```

La boucle sur le jeton de continuation n'est pas de l'anticipation : sans elle, la liste s'arrêterait à mille objets **en paraissant complète**. C'est le genre de défaut qui n'apparaît que le jour où il est coûteux.

- [ ] **Step 2: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur.

---

### Task 4 : Sélecteur réutilisable

**Files:**
- Create: `src/components/features/admin/assets/AssetPicker.tsx`

**Interfaces:**
- Consomme : `listAssets` (Task 3).
- Produit : `<AssetPicker value={string | null} onChange={(key: string | null) => void} prefix={string} />`, consommé par les sub-projects `08` et `13`.

> Ce composant ne sert à rien dans ce sub-project. Il est écrit ici parce que c'est le moment où l'on connaît la forme des données, plutôt que d'être improvisé dans un formulaire déjà chargé.

- [ ] **Step 1: Écrire le sélecteur**

Composant client affichant les assets d'un préfixe sous forme de vignettes sélectionnables, avec une option de retrait. Points imposés :

- il reçoit et renvoie une **clé d'objet**, jamais un fichier
- les vignettes s'affichent via `/api/assets/<clé>`, seul point d'accès au bucket
- une option permet de revenir à l'absence de sélection, `coverFilename` et `logoFilename` étant nullables
- le préfixe restreint la liste au dossier pertinent, pour ne pas proposer un CV comme couverture de projet

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
- Modify: `src/app/admin/assets/page.tsx`

**Interfaces:**
- Consomme : `uploadAsset`, `deleteAsset` (Task 2), `listAssets` (Task 3).
- Produit : l'écran `/admin/assets` complet.

- [ ] **Step 1: Écrire la modale de dépôt**

Composant client en `useActionState`. Points imposés :

- un select du dossier alimenté par `ASSET_FOLDERS`, un champ de slug, un champ de fichier
- le nom du fichier est pré-rempli depuis le fichier choisi, en minuscules, et reste modifiable
- **la taille est vérifiée côté client avant l'envoi** : au-delà de `bodySizeLimit`, la requête est rejetée par le framework avant d'atteindre l'action, et le message par défaut n'explique rien
- si la clé existe déjà dans le listing, une confirmation est demandée avant envoi, R2 écrasant sans avertir

- [ ] **Step 2: Écrire la confirmation de suppression**

`AlertDialog` appelant `deleteAsset(key)`. Quand `state.message` vaut `asset_in_use`, afficher la liste `state.usedBy` avec une phrase expliquant que l'asset est utilisé et ne peut pas être supprimé.

- [ ] **Step 3: Écrire le navigateur d'assets**

Liste groupée par préfixe, chaque entrée montrant la vignette, la clé, la taille et la date de modification, avec une action de suppression.

- [ ] **Step 4: Remplacer la page d'attente**

```typescript
import { AssetsBrowser } from '@/components/features/admin/assets/AssetsBrowser'
import { AssetUploadDialog } from '@/components/features/admin/assets/AssetUploadDialog'
import { listAssets } from '@/server/queries/assets'

export default async function AdminAssetsPage() {
  const assets = await listAssets()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Assets</h1>
        <AssetUploadDialog existingKeys={assets.map((a) => a.key)} />
      </div>
      <div className="mt-6">
        <AssetsBrowser assets={assets} />
      </div>
    </div>
  )
}
```

`existingKeys` est ce qui permet à la modale de détecter un écrasement avant l'envoi.

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

- [ ] **Step 9: Vérifier le bucket de destination**

```bash
AWS_ACCESS_KEY_ID=<clé dev> AWS_SECRET_ACCESS_KEY=<secret dev> AWS_DEFAULT_REGION=auto \
  aws s3 ls s3://portfolio-assets-dev/ --recursive \
  --endpoint-url https://<account-id>.eu.r2.cloudflarestorage.com | tail -5
```

Expected: le fichier déposé en local est dans le bucket de développement, pas dans celui de production. Le token de développement ne peut de toute façon pas lire `portfolio-assets` : tenter la même commande sur ce bucket doit être refusé.

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

Ajouter les trois structures valides à la règle de convention de chemins :

| Structure | Segments | Exemple |
|---|---|---|
| `branding/<fichier>` | 2 | `branding/portrait.jpg` |
| `documents/<slug>/<fichier>` | 3 | `documents/cv/cv-thibaud-geisler-fr.pdf` |
| `projets/{client,personal}/<slug>/<fichier>` | 4 | `projets/client/foyer/logo.png` |

Sans cet ajout, la rule décrit `branding/` comme interdit alors qu'il est en place, et c'est elle qui est chargée automatiquement à la prochaine édition d'un fichier d'assets. C'est aussi ce constat d'arborescence qui justifie le slug conditionnel du schéma de la Task 1 : le documenter ailleurs que dans le plan est ce qui empêche qu'on le « corrige » plus tard en croyant à une incohérence.

- [ ] **Step 2: Consigner la limite de taille dans `docs/PRODUCTION.md`**

Ajouter la limite retenue là où les contraintes d'exploitation sont documentées : `serverActions.bodySizeLimit` est relevée à **8 Mo** pour le dépôt d'assets depuis l'espace admin, contre 1 Mo par défaut.

Préciser le raisonnement en une ligne, la valeur seule n'expliquant pas pourquoi elle a été choisie : la limite porte sur le corps HTTP brut, overhead multipart compris, et le plus gros cas réaliste est une capture PNG non optimisée de 1 à 3 Mo. Mentionner que la mise en garde de Next sur la consommation de ressources ne s'applique pas ici, l'action étant derrière l'authentification et joignable par le seul compte autorisé.

- [ ] **Step 3: Vérifier qu'aucune des deux structures ne contredit le code**

```bash
grep -rn "branding" .claude/rules/nextjs/assets.md src/lib/schemas/asset.ts
```

Expected: le dossier apparaît des deux côtés, avec la même profondeur et la même absence de slug.

- [ ] **Step 4: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): gestion des assets avec upload vers R2
```
