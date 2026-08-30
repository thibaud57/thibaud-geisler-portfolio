# CRUD des tags — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer, modifier et supprimer des tags depuis l'espace admin, et poser le pattern CRUD des entités légères.

**Architecture:** Des Server Actions calquées sur `submitContact`, validées par un schéma Zod partagé avec le formulaire, et un écran de liste dont le formulaire vit en modale. Les deux contraintes de la base — unicité du slug et interdiction de supprimer un tag rattaché — sont traduites en messages de formulaire plutôt que remontées comme erreurs techniques.

**Tech Stack:** Next.js 16 Server Actions, Zod 4, Prisma 7, React 19 (`useActionState`), shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/espace-admin/07-crud-tags-design.md`

## Global Constraints

- **TDD strict** : la stratégie du projet place les mutations de l'espace admin sous TDD complet. Les tests précèdent l'implémentation.
- Messages de validation **en français dans le schéma**. Le site public utilise des codes parce qu'il est bilingue ; l'admin ne l'est pas.
- Sur une erreur de **type** (`z.enum`, coercition), le paramètre Zod 4 est **`error`**, pas `message` : la v4 a fusionné `message`, `invalid_type_error` et `required_error` en une clé unique (`.claude/rules/zod/schemas.md`). Le second argument positionnel des checks (`.min(1, '...')`) reste inchangé.
- `useActionState`, sans librairie de formulaire, comme le formulaire de contact.
- Le champ `icon` est un **select** alimenté par le registre, jamais une saisie libre : `resolveTagIcon` renvoie `null` sans erreur sur une clé inconnue.
- Le select d'icône et la validation Zod tirent de la **même** source exportée depuis `src/lib/icons.tsx`.
- **Chaque Server Action ouvre par `await getCurrentUser()`**, hors de tout `try/catch`. Une action exportée est un endpoint HTTP invocable par quiconque connaît son identifiant : le layout protège l'affichage des pages, pas l'exécution des actions. `.claude/rules/nextjs/server-actions.md` l'impose deux fois, en « à faire » (défense en profondeur) et en « à éviter » (dépendre uniquement du proxy). L'appel doit précéder le `try`, sans quoi le `catch` avalerait l'interruption `unauthorized()` et transformerait un refus d'accès en `unknown_error`.
- **`updateTag('tags')`** après chaque mutation réussie, jamais avant. C'est `updateTag` et non `revalidateTag`, pour une raison de comportement observable : la doc Next 16 pose que `updateTag` fait attendre la requête suivante le temps de recharger (« Next request waits for fresh data, no stale content served »), là où `revalidateTag(tag, 'max')` sert du contenu périmé pendant que la revalidation tourne en arrière-plan. Le scénario 7 exige de voir le tag sur la page publique **immédiatement** après création : avec `'max'`, le premier chargement pourrait encore montrer l'ancien contenu et l'on conclurait à tort à un défaut.
- La forme historique `revalidateTag(tag)` à un seul argument est **dépréciée** en Next 16. La doc indique la migration : « Migrate to `updateTag` in Server Actions, or `profile="max"` ». Ces actions étant des Server Actions, `updateTag` est le remplaçant direct, et le seul contexte où il soit autorisé.
- `revalidateTag(tag, 'max')` reste correct **hors** Server Action, par exemple dans `src/instrumentation.ts` qui l'utilise déjà : ne pas y toucher.
- La requête d'administration ne filtre pas et n'utilise pas `'use cache'` : `findAllTags` fait les deux et masquerait des tags.
- `src/app/admin/tags/page.tsx` existe déjà comme page d'attente : la **remplacer**, ne pas en créer une seconde.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Rules :** `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/vitest/setup.md`.

---

### Task 1 : Exposer les clés d'icônes valides

**Files:**
- Modify: `src/lib/icons.tsx`

**Interfaces:**
- Consomme : les maps `SIMPLE_ICONS` et `LUCIDE_ICONS` existantes.
- Produit : `TAG_ICON_KEYS: readonly string[]`, consommée par le schéma de la Task 2 et par le formulaire de la Task 6.

- [ ] **Step 1: Dériver la liste des clés**

Ajouter à la fin de `src/lib/icons.tsx` :

```typescript
export const TAG_ICON_KEYS = [
  ...Object.keys(SIMPLE_ICONS).map((slug) => `simple-icons:${slug}`),
  ...Object.keys(LUCIDE_ICONS).map((slug) => `lucide:${slug}`),
].sort() as readonly string[]
```

Dériver plutôt que recopier : une icône ajoutée aux maps devient automatiquement sélectionnable et valide, sans qu'on ait à penser à une seconde liste.

- [ ] **Step 2: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur.

---

### Task 2 : Schéma de validation

**Files:**
- Create: `src/lib/schemas/tag.ts`

**Interfaces:**
- Consomme : `TAG_ICON_KEYS` de la Task 1.
- Produit : `tagSchema`, `TagInput`, consommés par les Server Actions de la Task 4 et le formulaire de la Task 6.

- [ ] **Step 1: Écrire le schéma**

```typescript
import { z } from 'zod'

import { TAG_ICON_KEYS } from '@/lib/icons'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const tagSchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Le slug est requis')
    .max(60, 'Le slug ne peut pas dépasser 60 caractères')
    .regex(SLUG_PATTERN, 'Le slug ne peut contenir que des minuscules, des chiffres et des tirets'),
  nameFr: z.string().trim().min(1, 'Le nom français est requis').max(60, 'Le nom français ne peut pas dépasser 60 caractères'),
  nameEn: z.string().trim().min(1, "Le nom anglais est requis").max(60, "Le nom anglais ne peut pas dépasser 60 caractères"),
  kind: z.enum(['LANGUAGE', 'FRAMEWORK', 'DATABASE', 'INFRA', 'AI', 'EXPERTISE'], {
    error: 'La catégorie est requise',
  }),
  icon: z
    .string()
    .trim()
    .refine((value) => value === '' || TAG_ICON_KEYS.includes(value), {
      message: "Cette icône n'existe pas dans le registre",
    })
    .optional(),
  displayOrder: z.coerce.number().int('L\'ordre doit être un entier').min(0, "L'ordre ne peut pas être négatif"),
})

export type TagInput = z.infer<typeof tagSchema>
```

`.toLowerCase()` dans le schéma règle la normalisation à la source : `React` devient `react` avant d'atteindre la base, ce qui évite deux tags pour le même identifiant.

La chaîne vide est acceptée pour `icon` parce qu'un `FormData` renvoie `''` et non `undefined` pour un select non renseigné.

---

### Task 3 : Types d'état de formulaire

**Files:**
- Create: `src/server/actions/tags.types.ts`

**Interfaces:**
- Consomme : `TagInput` de la Task 2.
- Produit : `TagFormState`, `initialTagFormState`, consommés par les Tasks 4 et 6.

- [ ] **Step 1: Écrire les types**

```typescript
import type { TagInput } from '@/lib/schemas/tag'

export type TagFormMessage = 'slug_taken' | 'tag_in_use' | 'unknown_error' | null

export type TagFormState = {
  ok: boolean | null
  errors: Partial<Record<keyof TagInput, string[]>>
  message: TagFormMessage
  values?: Partial<Record<keyof TagInput, string>>
}

export const initialTagFormState: TagFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

Même forme que `ContactFormState`, pour que `useActionState` s'utilise de façon identique d'un formulaire à l'autre.

---

### Task 4 : Server Actions, en TDD

**Files:**
- Test: `src/server/actions/tags.test.ts`
- Create: `src/server/actions/tags.ts`

**Interfaces:**
- Consomme : `tagSchema` (Task 2), `TagFormState` (Task 3), `prisma`, `createActionLogger`.
- Produit : `createTag`, `updateTag`, `deleteTag`, consommées par les composants des Tasks 6 et 7.

- [ ] **Step 1: Écrire les tests qui échouent**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock('@/lib/prisma', () => ({
  prisma: {
    tag: { create: vi.fn(), update: vi.fn(), delete: vi.fn() },
  },
}))
vi.mock('@/lib/get-current-user', () => ({ getCurrentUser: vi.fn() }))


import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-current-user'
import { createTag, deleteTag } from './tags'
import { initialTagFormState } from './tags.types'

const VALID = {
  slug: 'react',
  nameFr: 'React',
  nameEn: 'React',
  kind: 'FRAMEWORK',
  icon: '',
  displayOrder: '0',
} as const

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...VALID, ...overrides })) {
    data.set(key, value)
  }
  return data
}

describe('createTag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refuse un slug vide sans toucher la base', async () => {
    const state = await createTag(initialTagFormState, buildFormData({ slug: '' }))

    expect(state.ok).toBe(false)
    expect(state.errors.slug).toBeDefined()
    expect(prisma.tag.create).not.toHaveBeenCalled()
  })

  it('refuse un nom français vide', async () => {
    const state = await createTag(initialTagFormState, buildFormData({ nameFr: '' }))

    expect(state.errors.nameFr).toBeDefined()
  })

  it('refuse un nom anglais vide', async () => {
    const state = await createTag(initialTagFormState, buildFormData({ nameEn: '' }))

    expect(state.errors.nameEn).toBeDefined()
  })

  it('refuse une catégorie hors enum', async () => {
    const state = await createTag(initialTagFormState, buildFormData({ kind: 'AUTRE' }))

    expect(state.errors.kind).toBeDefined()
    expect(prisma.tag.create).not.toHaveBeenCalled()
  })

  it('refuse une icône absente du registre', async () => {
    const state = await createTag(initialTagFormState, buildFormData({ icon: 'simple-icons:inexistant' }))

    expect(state.errors.icon).toBeDefined()
  })

  it('accepte une icône vide', async () => {
    vi.mocked(prisma.tag.create).mockResolvedValue({} as never)

    const state = await createTag(initialTagFormState, buildFormData({ icon: '' }))

    expect(state.ok).toBe(true)
  })

  it('normalise le slug en minuscules', async () => {
    vi.mocked(prisma.tag.create).mockResolvedValue({} as never)

    await createTag(initialTagFormState, buildFormData({ slug: 'React' }))

    expect(prisma.tag.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'react' }) }),
    )
  })

  it('refuse un slug contenant des espaces', async () => {
    const state = await createTag(initialTagFormState, buildFormData({ slug: 'next js' }))

    expect(state.errors.slug).toBeDefined()
  })

  it("invalide l'étiquette de cache après une création réussie", async () => {
    vi.mocked(prisma.tag.create).mockResolvedValue({} as never)

    await createTag(initialTagFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith('tags')
  })

  it("traduit une violation d'unicité en erreur de champ", async () => {
    vi.mocked(prisma.tag.create).mockRejectedValue({ code: 'P2002', meta: { target: ['slug'] } })

    const state = await createTag(initialTagFormState, buildFormData())

    expect(state.ok).toBe(false)
    expect(state.message).toBe('slug_taken')
    expect(state.errors.slug).toBeDefined()
  })

  it('retourne les valeurs saisies en cas d\'échec', async () => {
    const state = await createTag(initialTagFormState, buildFormData({ slug: '', nameFr: 'Réact' }))

    expect(state.values?.nameFr).toBe('Réact')
  })

  it('refuse un appel sans session, avant toute validation', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    await expect(createTag(initialTagFormState, buildFormData())).rejects.toThrow()

    expect(prisma.tag.create).not.toHaveBeenCalled()
  })
})

describe('deleteTag', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('supprime un tag libre', async () => {
    vi.mocked(prisma.tag.delete).mockResolvedValue({} as never)

    const state = await deleteTag('tag-1')

    expect(state.ok).toBe(true)
    expect(updateTag).toHaveBeenCalledWith('tags')
  })

  it('traduit une violation de clé étrangère en message explicite', async () => {
    vi.mocked(prisma.tag.delete).mockRejectedValue({ code: 'P2003' })

    const state = await deleteTag('tag-1')

    expect(state.ok).toBe(false)
    expect(state.message).toBe('tag_in_use')
  })
})
```

Les deux tests sur les codes Prisma sont les plus importants : sans eux, supprimer un tag utilisé remonterait une erreur technique à l'écran au lieu d'un message compréhensible.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run --project unit src/server/actions/tags.test.ts`
Expected: FAIL, le module `./tags` n'existe pas.

- [ ] **Step 3: Écrire les Server Actions**

```typescript
'use server'

import 'server-only'
import { updateTag } from 'next/cache'

import { getCurrentUser } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'
import { tagSchema, type TagInput } from '@/lib/schemas/tag'
import { createActionLogger } from '@/lib/server-utils'

import { type TagFormState } from './tags.types'

type ZodFieldErrors = Partial<Record<keyof TagInput, string[]>>

function isPrismaError(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code
}

function collectValues(formData: FormData): TagFormState['values'] {
  return {
    slug: String(formData.get('slug') ?? ''),
    nameFr: String(formData.get('nameFr') ?? ''),
    nameEn: String(formData.get('nameEn') ?? ''),
    kind: String(formData.get('kind') ?? ''),
    icon: String(formData.get('icon') ?? ''),
    displayOrder: String(formData.get('displayOrder') ?? '0'),
  }
}

export async function createTag(
  _prevState: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('createTag')
  const values = collectValues(formData)

  const result = tagSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.flatten().fieldErrors as ZodFieldErrors,
      message: null,
      values,
    }
  }

  try {
    await prisma.tag.create({
      data: { ...result.data, icon: result.data.icon || null },
    })
    updateTag('tags')
    log.info({ event: 'tag:created', slug: result.data.slug })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    if (isPrismaError(err, 'P2002')) {
      return {
        ok: false,
        errors: { slug: ['Ce slug est déjà utilisé par un autre tag'] },
        message: 'slug_taken',
        values,
      }
    }
    log.error({ err, event: 'tag:create_failed' })
    return { ok: false, errors: {}, message: 'unknown_error', values }
  }
}

export async function updateTag(
  id: string,
  _prevState: TagFormState,
  formData: FormData,
): Promise<TagFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('updateTag')
  const values = collectValues(formData)

  const result = tagSchema.safeParse(Object.fromEntries(formData))
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.flatten().fieldErrors as ZodFieldErrors,
      message: null,
      values,
    }
  }

  try {
    await prisma.tag.update({
      where: { id },
      data: { ...result.data, icon: result.data.icon || null },
    })
    updateTag('tags')
    log.info({ event: 'tag:updated', slug: result.data.slug })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    if (isPrismaError(err, 'P2002')) {
      return {
        ok: false,
        errors: { slug: ['Ce slug est déjà utilisé par un autre tag'] },
        message: 'slug_taken',
        values,
      }
    }
    log.error({ err, event: 'tag:update_failed' })
    return { ok: false, errors: {}, message: 'unknown_error', values }
  }
}

export async function deleteTag(id: string): Promise<TagFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('deleteTag')

  try {
    await prisma.tag.delete({ where: { id } })
    updateTag('tags')
    log.info({ event: 'tag:deleted', id })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    if (isPrismaError(err, 'P2003')) {
      return {
        ok: false,
        errors: {},
        message: 'tag_in_use',
      }
    }
    log.error({ err, event: 'tag:delete_failed' })
    return { ok: false, errors: {}, message: 'unknown_error' }
  }
}
```

`icon: result.data.icon || null` convertit la chaîne vide du formulaire en `null` en base, le champ Prisma étant optionnel.

`updateTag` est appelé **après** l'écriture, jamais avant : une invalidation précédant un échec purgerait le cache sans raison.

`await getCurrentUser()` ouvre chaque action, **avant** le `try`. C'est la défense en profondeur imposée par la rule : le layout protège les pages, pas les actions, et une action exportée reste joignable par une requête forgée. Placé dans le `try`, l'appel verrait son interruption `unauthorized()` avalée par le `catch` et convertie en `unknown_error`, ce qui masquerait un refus d'accès derrière une erreur technique.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run --project unit src/server/actions/tags.test.ts`
Expected: PASS, quatorze cas verts.

---

### Task 5 : Requête d'administration

**Files:**
- Modify: `src/server/queries/tags.ts`

**Interfaces:**
- Consomme : `prisma`.
- Produit : `findAllTagsForAdmin()`, consommée par la page de la Task 7.

- [ ] **Step 1: Ajouter la requête**

```typescript
export async function findAllTagsForAdmin(): Promise<Tag[]> {
  return prisma.tag.findMany({
    orderBy: [{ displayOrder: 'asc' }, { slug: 'asc' }],
  })
}
```

Ni `'use cache'` ni filtre sur `HIDDEN_ON_ABOUT_TAG_SLUGS`, contrairement à `findAllTags`. L'administration doit voir tous les tags, et immédiatement après une mutation. Réutiliser la requête publique masquerait les quatre slugs cachés et donnerait l'impression qu'ils ont été supprimés.

Pas de localisation non plus : l'écran affiche `nameFr` et `nameEn` côte à côte, puisqu'il sert à les éditer.

- [ ] **Step 2: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur.

---

### Task 6 : Formulaire en modale

**Files:**
- Create: `src/components/features/admin/tags/TagFormDialog.tsx`
- Create: `src/components/ui/alert-dialog.tsx` (via le CLI)

**Interfaces:**
- Consomme : `createTag` et `updateTag` (Task 4), `tagSchema` (Task 2), `TAG_ICON_KEYS` (Task 1), `initialTagFormState` (Task 3).
- Produit : `<TagFormDialog tag={Tag | null} />`, monté par la table de la Task 7.

- [ ] **Step 1: Installer le composant de confirmation**

```bash
pnpm dlx shadcn@latest add alert-dialog
```

- [ ] **Step 2: Écrire le formulaire**

Le composant est client, monte un `Dialog` shadcn et utilise `useActionState`. Points imposés :

- `const [state, formAction, pending] = useActionState(action, initialTagFormState)` où `action` vaut `createTag` en création, ou `updateTag.bind(null, tag.id)` en modification
- chaque champ rend son erreur sous lui : `{state.errors.slug?.[0]}` dans un `<p className="text-sm text-destructive">`
- les valeurs sont repeuplées depuis `state.values` en cas d'échec, via `defaultValue`
- le select d'icône itère sur `TAG_ICON_KEYS`, avec une première option vide libellée « Aucune »
- le select de catégorie itère sur les six valeurs de `TagKind`
- le bouton de soumission est désactivé quand `pending` vaut `true`
- un `useEffect` sur `state.ok` ferme la modale et déclenche un toast `sonner`

Ne pas installer de librairie de formulaire : `useActionState` et les champs shadcn suffisent, conformément à DESIGN.md.

- [ ] **Step 3: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 7 : Écran de liste

**Files:**
- Create: `src/components/features/admin/tags/TagsTable.tsx`
- Create: `src/components/features/admin/tags/DeleteTagDialog.tsx`
- Modify: `src/app/admin/tags/page.tsx`

**Interfaces:**
- Consomme : `findAllTagsForAdmin` (Task 5), `deleteTag` (Task 4), `<TagFormDialog />` (Task 6).
- Produit : l'écran `/admin/tags` complet.

- [ ] **Step 1: Écrire la confirmation de suppression**

Composant client montant un `AlertDialog` shadcn. Il appelle `deleteTag(id)` à la confirmation, et affiche `state.message === 'tag_in_use'` sous la forme d'un message expliquant que le tag est utilisé par des projets et ne peut pas être supprimé.

C'est le seul endroit où cette contrainte devient visible pour l'utilisateur : sans ce traitement, la suppression échouerait sans explication.

- [ ] **Step 2: Écrire la table**

Composant client rendant un `Table` shadcn avec les colonnes : slug, nom français, nom anglais, catégorie (en `Badge`), icône (rendue via `resolveTagIcon`), ordre, et une colonne d'actions portant l'édition et la suppression.

Rendre l'icône plutôt que sa clé permet de constater d'un coup d'œil qu'une icône ne résout pas.

- [ ] **Step 3: Remplacer la page d'attente**

```typescript
import { findAllTagsForAdmin } from '@/server/queries/tags'
import { TagsTable } from '@/components/features/admin/tags/TagsTable'
import { TagFormDialog } from '@/components/features/admin/tags/TagFormDialog'

export default async function AdminTagsPage() {
  const tags = await findAllTagsForAdmin()

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tags</h1>
        <TagFormDialog tag={null} />
      </div>
      <div className="mt-6">
        <TagsTable tags={tags} />
      </div>
    </div>
  )
}
```

Server Component qui charge les données et les passe à la table. Aucun `'use cache'`, contrainte héritée de l'espace admin.

- [ ] **Step 4: Vérifier que tout compile**

```bash
just typecheck && just lint && just build
```

Expected: aucune erreur.

---

### Task 8 : Vérifier de bout en bout

**Files:** aucun fichier du dépôt.

- [ ] **Step 1: Créer un tag**

Depuis `/admin/tags`, créer un tag avec un slug inédit, les deux noms, une catégorie et une icône.

Expected: il apparaît dans la liste, avec son icône rendue.

- [ ] **Step 2: Vérifier la répercussion publique**

Consulter une page publique affichant les tags, par exemple `/fr/a-propos`.

Expected: le nouveau tag y figure. S'il n'apparaît pas alors qu'il est bien en base, c'est que `updateTag('tags')` n'a pas été appelé.

- [ ] **Step 3: Vérifier le refus d'un slug en double**

Tenter de créer un second tag avec le même slug.

Expected: message « Ce slug est déjà utilisé par un autre tag » sous le champ, et aucune ligne créée.

- [ ] **Step 4: Vérifier la normalisation**

Créer un tag avec le slug `MonTag`.

Expected: il est enregistré en `montag`.

- [ ] **Step 5: Vérifier la suppression d'un tag libre**

Supprimer un tag rattaché à aucun projet.

Expected: il disparaît de la liste et de la base.

- [ ] **Step 6: Vérifier le refus de suppression d'un tag utilisé**

Tenter de supprimer un tag rattaché à un projet, par exemple un tag du seed.

Expected: message expliquant que le tag est utilisé par des projets. Ni le tag ni ses rattachements ne sont altérés. C'est le critère central de ce sub-project : une erreur Prisma brute affichée ici signifierait que le code `P2003` n'est pas intercepté.

- [ ] **Step 7: Vérifier que les tags cachés sont visibles en administration**

Chercher dans la liste les slugs `piagent`, `php`, `local` et `vercel`.

Expected: ils y figurent tous les quatre. Leur absence signalerait que la requête publique filtrante a été réutilisée.

- [ ] **Step 8: Lancer la suite complète**

```bash
just test
```

Expected: tous les tests verts.

- [ ] **Step 9: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): CRUD des tags
```
