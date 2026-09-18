# CRUD des entreprises — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gérer les entreprises clientes sur un écran plein dédié, poser l'arborescence complète de la barre latérale admin et ajouter le sélecteur de colonnes au `DataTable` partagé.

**Architecture:** Le pattern du sub-project `07` est repris à l'identique pour les Server Actions et l'état de formulaire. Le formulaire vit sur son propre écran (`entreprises/nouvelle`, `entreprises/[id]`), pas en modale : le `13` choisit une entreprise existante plutôt que d'en créer une à la volée, donc un seul point de montage. Les secteurs se lisent avec `getAll` via un Combobox à sélection multiple, écrit ici comme composant partagé. Le `DataTable` gagne un sélecteur de colonnes générique, réutilisé par l'écran des tags déjà livré, et la liste des entreprises gagne deux vues (Toutes / Travaillées) portées chacune par sa propre route, sur le même principe que les vues Tous / Client / Perso que le `12` posera pour les projets. La barre latérale porte toute l'arborescence de la maquette, entrées sans écran désactivées.

**Tech Stack:** Next.js 16 Server Actions, Zod 4, Prisma 7, React 19 (`useActionState`), shadcn/ui (`Popover`, `Command`, `Breadcrumb`), Vitest.

**Spec:** `docs/superpowers/specs/espace-admin/08-crud-entreprises-design.md`

## Global Constraints

- **TDD strict** sur les Server Actions, comme au sub-project `07`.
- Messages de validation **en français dans le schéma**, `useActionState` sans librairie de formulaire.
- `sectors` se lit avec **`formData.getAll('sectors')`**, jamais `get` : `get` ne renverrait que le premier secteur, silencieusement.
- **Un `SelectItem` Radix ne peut pas porter `value=""`** : les deux `Select` nullables (Taille, Entité légale) rendent un premier item de valeur sentinel `NONE_VALUE` (`'aucune'`, exporté par `src/lib/schemas/company.ts`), que le schéma retraduit en `null`. `websiteUrl`, un `Input` texte, garde `''` : la contrainte ne touche que les `Select`.
- Les deux `P2002` possibles se discriminent par **`meta.target`** : slug et entité légale portent chacun une contrainte d'unicité.
- **Chaque Server Action ouvre par `await getCurrentUser()`**, hors de tout `try/catch`. Une action exportée est un endpoint HTTP invocable par quiconque connaît son identifiant : le layout protège l'affichage des pages, pas l'exécution des actions. `.claude/rules/nextjs/server-actions.md` l'impose deux fois, en « à faire » (défense en profondeur) et en « à éviter » (dépendre uniquement du proxy). L'appel doit précéder le `try`, sans quoi le `catch` avalerait l'interruption `unauthorized()` et transformerait un refus d'accès en `unknown_error`.
- Invalider **`updateTag('projects')`** puis **`revalidatePath('/admin/entreprises')`** : la première étiquette ne couvre que les pages publiques, l'écran d'administration lit sans cache et sans étiquette, rien ne le rafraîchirait sinon. Pas d'étiquette propre aux entreprises : les pages publiques y accèdent par les projets.
- Ne pas toucher à `logoFilename`, et surtout ne pas l'écraser en `null` à la modification parce que le formulaire ne porte pas le champ. Il devient éditable au sub-project `10`.
- `src/app/admin/(protected)/entreprises/page.tsx` existe comme page d'attente : la **remplacer**.
- **Aucune requête Prisma directement dans un composant de page** : avec `cacheComponents: true`, une query sans `'use cache'` hors `<Suspense>` fait échouer le build. Même motif qu'au sub-project `07`, sur les trois pages de cet écran (liste, création, modification).
- **`websiteUrl` n'accepte que `http` et `https`** : `z.url()` nu laisse passer `javascript:`, et ce champ finit dans un `href` public. Exigé par `docs/PRODUCTION.md` § Checklist Pré-MEP avant le premier formulaire d'édition de l'admin, qui est celui-ci.
- **`Company` vit dans le schema `freelance`** depuis le sub-project `03`. Le client Prisma expose toujours `prisma.company`, rien ne change dans le code ; c'est simplement le premier écran du domaine CRM.
- **La vue « Travaillées » se déduit de `_count.clientMetas`**, portée par sa propre route, `/admin/entreprises/travaillees`. Route statique, résolue avant la route dynamique `entreprises/[id]` par Next.js : aucune collision, `[id]` étant en plus keyée par l'UUID de l'entreprise, jamais par son slug.
- **Le sélecteur de colonnes du `DataTable` ne s'affiche que si au moins une colonne est `hideable`** : l'écran des tags en déclare quatre (Nom EN, Catégorie, Icône, Projets), toutes visibles par défaut.
- **La barre latérale n'active qu'Accueil, Projets, Tags, Entreprises, Assets et les sous-entrées Toutes/Travaillées d'Entreprises.** `/admin` existe déjà (shell admin, tableau de bord) : Accueil pointe vers cette route et n'est pas désactivée. Toute autre entrée est rendue sans `href`, non focusable au clavier (`tabIndex={-1}`), avec `aria-disabled`.
- Installer un composant shadcn **seulement s'il est absent**, jamais d'après une liste figée (`breadcrumb` manque, `popover`/`command`/`checkbox`/`select`/`alert-dialog`/`pagination` viennent du `07`).
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Modèle Prisma concerné** (vérifié) :

```prisma
model Company {
  id            String          @id @default(uuid(7))
  slug          String          @unique
  name          String
  logoFilename  String?
  websiteUrl    String?
  sectors       CompanySector[]
  size          CompanySize?
  legalEntityId String?         @unique
  legalEntity   LegalEntity?    @relation(fields: [legalEntityId], references: [id], onDelete: SetNull)
  clientMetas   ClientMeta[]

  @@schema("freelance")
}

enum CompanySector {
  ASSURANCE  FINTECH  SAAS  SERVICES_RH  ESN_CONSEIL  LOGICIELS_ENTREPRISE
  ECOMMERCE  IA_AUTOMATISATION  EMARKETING  BANQUE  AUTRE
}

enum CompanySize { TPE  PME  ETI  GROUPE }
```

`ClientMeta` référence `Company` avec `onDelete: Restrict`. `_count.clientMetas` sert à la fois à la colonne Projets et à la vue « Travaillées ».

**Rules :** `.claude/rules/nextjs/server-actions.md`, `.claude/rules/nextjs/routing.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/vitest/setup.md`.

---

### Task 1 : Schéma et types

**Files:**
- Create: `src/lib/schemas/company.ts`
- Create: `src/server/actions/companies.types.ts`

**Interfaces:**
- Consomme : rien.
- Produit : `companySchema`, `CompanyInput`, `COMPANY_SECTORS`, `COMPANY_SIZES`, `NONE_VALUE`, `CompanyFormState`, `initialCompanyFormState`, consommés par les Tasks 2, 6 et 7.

- [ ] **Step 1: Écrire le schéma**

```typescript
import { z } from 'zod'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const SECTORS = [
  'ASSURANCE',
  'FINTECH',
  'SAAS',
  'SERVICES_RH',
  'ESN_CONSEIL',
  'LOGICIELS_ENTREPRISE',
  'ECOMMERCE',
  'IA_AUTOMATISATION',
  'EMARKETING',
  'BANQUE',
  'AUTRE',
] as const

export const COMPANY_SECTORS = SECTORS
export const COMPANY_SIZES = ['TPE', 'PME', 'ETI', 'GROUPE'] as const

// Un SelectItem Radix refuse value="" : les deux Select nullables du formulaire (Taille, Entité
// légale) rendent ce sentinel comme premier item, retraduit en null ci-dessous.
export const NONE_VALUE = 'aucune'

export const companySchema = z.object({
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, 'Le slug est requis')
    .max(60, 'Le slug ne peut pas dépasser 60 caractères')
    .regex(SLUG_PATTERN, 'Le slug ne peut contenir que des minuscules, des chiffres et des tirets'),
  name: z.string().trim().min(1, 'Le nom est requis').max(120, 'Le nom ne peut pas dépasser 120 caractères'),
  sectors: z
    .array(z.enum(SECTORS, { error: 'Secteur inconnu' }))
    .min(1, 'Sélectionne au moins un secteur'),
  size: z
    .union([z.enum(COMPANY_SIZES), z.literal(NONE_VALUE)], { error: 'Taille inconnue' })
    .transform((value) => (value === NONE_VALUE ? null : value)),
  websiteUrl: z
    .union([z.url({ protocol: /^https?$/ }), z.literal('')], {
      error: "L'adresse du site n'est pas valide",
    })
    .transform((value) => (value === '' ? null : value)),
  legalEntityId: z
    .string()
    .trim()
    .transform((value) => (value === NONE_VALUE ? null : value)),
})

export type CompanyInput = z.infer<typeof companySchema>
```

**Le `protocol` sur `websiteUrl` n'est pas optionnel.** `z.url()` nu valide par `new URL()`, qui accepte `javascript:alert(1)` : ce champ finit dans un `href` de page publique, c'est donc un XSS stocké. `docs/PRODUCTION.md` § Checklist Pré-MEP le nomme explicitement et demande de le corriger « avant le premier formulaire d'édition de l'espace admin », qui est celui-ci.

`src/lib/url.ts` porte bien un `safeExternalUrl`, mais il filtre au rendu du seul case study : il ne couvre ni l'écriture, ni la table admin, ni le badge entreprise.

`legalEntityId` n'a pas besoin d'un `z.union` avec `NONE_VALUE` : `NONE_VALUE` est lui-même une chaîne non vide valide pour `z.string()`, le `transform` la reconnaît après coup et la retraduit en `null`. `size` en revanche doit rester une union, `z.enum` seul rejetterait le sentinel.

- [ ] **Step 2: Écrire les types d'état**

```typescript
import type { CompanyInput } from '@/lib/schemas/company'

export type CompanyFormMessage =
  | 'slug_taken'
  | 'legal_entity_taken'
  | 'company_in_use'
  | 'unknown_error'
  | null

export type CompanyFormState = {
  ok: boolean | null
  errors: Partial<Record<keyof CompanyInput, string[]>>
  message: CompanyFormMessage
  values?: Partial<Record<string, string | string[]>>
}

export const initialCompanyFormState: CompanyFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

Pas de `createdId` : le formulaire projet du `13` choisit une entreprise existante, il n'en crée pas à la volée depuis cet écran. Le succès se signale par une redirection vers la liste, pas par un identifiant remonté à un appelant.

---

### Task 2 : Server Actions, en TDD

**Files:**
- Test: `src/server/actions/companies.test.ts`
- Create: `src/server/actions/companies.ts`

**Interfaces:**
- Consomme : `companySchema`, `NONE_VALUE` (Task 1), `prisma`, `createActionLogger`.
- Produit : `createCompany`, `updateCompany`, `deleteCompany`, consommées par les Tasks 6 et 7.

- [ ] **Step 1: Écrire les tests qui échouent**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock('next/cache', () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock('@/lib/prisma', () => ({
  prisma: { company: { create: vi.fn(), update: vi.fn(), delete: vi.fn() } },
}))
vi.mock('@/lib/get-current-user', () => ({ getCurrentUser: vi.fn() }))

import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-current-user'
import { NONE_VALUE } from '@/lib/schemas/company'
import { createCompany, deleteCompany } from './companies'
import { initialCompanyFormState } from './companies.types'

const BASE_FIELDS = { slug: 'acme', name: 'Acme', size: NONE_VALUE, websiteUrl: '', legalEntityId: NONE_VALUE }

function buildFormData(
  overrides: Record<string, string> = {},
  sectors: string[] = ['SAAS'],
): FormData {
  const data = new FormData()
  for (const [key, value] of Object.entries({ ...BASE_FIELDS, ...overrides })) {
    data.set(key, value)
  }
  for (const sector of sectors) data.append('sectors', sector)
  return data
}

describe('createCompany', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(prisma.company.create).mockResolvedValue({ id: 'c1' } as never)
  })

  it('refuse un slug vide sans toucher la base', async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: '' }))

    expect(state.errors.slug).toBeDefined()
    expect(prisma.company.create).not.toHaveBeenCalled()
  })

  it('refuse un nom vide', async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ name: '' }))

    expect(state.errors.name).toBeDefined()
  })

  it('refuse un slug mal formé', async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: 'Acme Corp' }))

    expect(state.errors.slug).toBeDefined()
  })

  it('normalise le slug en minuscules', async () => {
    await createCompany(initialCompanyFormState, buildFormData({ slug: 'Acme' }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ slug: 'acme' }) }),
    )
  })

  it('refuse un secteur inconnu', async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({}, ['INCONNU']))

    expect(state.errors.sectors).toBeDefined()
  })

  it('refuse une liste de secteurs vide', async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({}, []))

    expect(state.errors.sectors).toBeDefined()
  })

  it('conserve tous les secteurs soumis', async () => {
    await createCompany(initialCompanyFormState, buildFormData({}, ['SAAS', 'FINTECH']))

    expect(prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ sectors: ['SAAS', 'FINTECH'] }) }),
    )
  })

  it('refuse une taille inconnue', async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ size: 'ENORME' }))

    expect(state.errors.size).toBeDefined()
  })

  it('enregistre le sentinel "aucune" en null pour la taille', async () => {
    await createCompany(initialCompanyFormState, buildFormData({ size: NONE_VALUE }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ size: null }) }),
    )
  })

  it('refuse une adresse de site invalide', async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ websiteUrl: 'pas-une-url' }))

    expect(state.errors.websiteUrl).toBeDefined()
  })

  it('enregistre le sentinel "aucune" en null pour l\'entité légale', async () => {
    await createCompany(initialCompanyFormState, buildFormData({ legalEntityId: NONE_VALUE }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ legalEntityId: null }) }),
    )
  })

  it('enregistre un site web vide en null', async () => {
    await createCompany(initialCompanyFormState, buildFormData({ websiteUrl: '' }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ websiteUrl: null }) }),
    )
  })

  it('retourne les valeurs saisies en cas d\'échec', async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ slug: '' }))

    expect(state.values?.name).toBe('Acme')
  })

  it("invalide l'étiquette projects après une création réussie", async () => {
    await createCompany(initialCompanyFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith('projects')
  })

  it('attribue une violation de slug au champ slug', async () => {
    vi.mocked(prisma.company.create).mockRejectedValue({ code: 'P2002', meta: { target: ['slug'] } })

    const state = await createCompany(initialCompanyFormState, buildFormData())

    expect(state.message).toBe('slug_taken')
    expect(state.errors.slug).toBeDefined()
    expect(state.errors.legalEntityId).toBeUndefined()
  })

  it("attribue une violation d'entité légale au bon champ", async () => {
    vi.mocked(prisma.company.create).mockRejectedValue({
      code: 'P2002',
      meta: { target: ['legalEntityId'] },
    })

    const state = await createCompany(initialCompanyFormState, buildFormData())

    expect(state.message).toBe('legal_entity_taken')
    expect(state.errors.legalEntityId).toBeDefined()
    expect(state.errors.slug).toBeUndefined()
  })

  it('refuse un appel sans session, avant toute validation', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    await expect(createCompany(initialCompanyFormState, buildFormData())).rejects.toThrow()

    expect(prisma.company.create).not.toHaveBeenCalled()
  })
})

describe('deleteCompany', () => {
  beforeEach(() => vi.clearAllMocks())

  it('supprime une entreprise libre', async () => {
    vi.mocked(prisma.company.delete).mockResolvedValue({} as never)

    const state = await deleteCompany('c1')

    expect(state.ok).toBe(true)
    expect(updateTag).toHaveBeenCalledWith('projects')
  })

  it('traduit une violation de clé étrangère en message explicite', async () => {
    vi.mocked(prisma.company.delete).mockRejectedValue({ code: 'P2003' })

    const state = await deleteCompany('c1')

    expect(state.message).toBe('company_in_use')
  })
})
```

Les deux derniers tests de `createCompany` portant sur `P2002` sont ceux qui comptent le plus : ils vérifient qu'une même erreur aboutit sous deux champs différents selon sa cible. Sans cette discrimination, on afficherait « ce slug est déjà pris » alors que le problème vient de l'entité légale.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run --project unit src/server/actions/companies.test.ts`
Expected: FAIL, le module `./companies` n'existe pas.

- [ ] **Step 3: Écrire les Server Actions**

```typescript
'use server'

import 'server-only'
import { revalidatePath, updateTag } from 'next/cache'

import { getCurrentUser } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'
import { companySchema, type CompanyInput } from '@/lib/schemas/company'
import { createActionLogger } from '@/lib/server-utils'

import { type CompanyFormState } from './companies.types'

type ZodFieldErrors = Partial<Record<keyof CompanyInput, string[]>>

function prismaErrorTarget(err: unknown): string[] | null {
  if (typeof err !== 'object' || err === null || !('code' in err)) return null
  const target = (err as { meta?: { target?: unknown } }).meta?.target
  return Array.isArray(target) ? (target as string[]) : []
}

function hasCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code
}

function parseFormData(formData: FormData) {
  return companySchema.safeParse({
    slug: formData.get('slug') ?? '',
    name: formData.get('name') ?? '',
    sectors: formData.getAll('sectors'),
    size: formData.get('size') ?? '',
    websiteUrl: formData.get('websiteUrl') ?? '',
    legalEntityId: formData.get('legalEntityId') ?? '',
  })
}

function collectValues(formData: FormData): CompanyFormState['values'] {
  return {
    slug: String(formData.get('slug') ?? ''),
    name: String(formData.get('name') ?? ''),
    sectors: formData.getAll('sectors').map(String),
    size: String(formData.get('size') ?? ''),
    websiteUrl: String(formData.get('websiteUrl') ?? ''),
    legalEntityId: String(formData.get('legalEntityId') ?? ''),
  }
}

function mapUniqueViolation(err: unknown, values: CompanyFormState['values']): CompanyFormState | null {
  if (!hasCode(err, 'P2002')) return null

  const target = prismaErrorTarget(err) ?? []
  if (target.includes('legalEntityId')) {
    return {
      ok: false,
      errors: { legalEntityId: ['Cette entité légale est déjà rattachée à une autre entreprise'] },
      message: 'legal_entity_taken',
      values,
    }
  }
  return {
    ok: false,
    errors: { slug: ['Ce slug est déjà utilisé par une autre entreprise'] },
    message: 'slug_taken',
    values,
  }
}

export async function createCompany(
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('createCompany')
  const values = collectValues(formData)

  const result = parseFormData(formData)
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.flatten().fieldErrors as ZodFieldErrors,
      message: null,
      values,
    }
  }

  try {
    await prisma.company.create({ data: result.data })
    updateTag('projects')
    revalidatePath('/admin/entreprises')
    log.info({ event: 'company:created', slug: result.data.slug })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    const mapped = mapUniqueViolation(err, values)
    if (mapped) return mapped

    log.error({ err, event: 'company:create_failed' })
    return { ok: false, errors: {}, message: 'unknown_error', values }
  }
}

export async function updateCompany(
  id: string,
  _prevState: CompanyFormState,
  formData: FormData,
): Promise<CompanyFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('updateCompany')
  const values = collectValues(formData)

  const result = parseFormData(formData)
  if (!result.success) {
    return {
      ok: false,
      errors: result.error.flatten().fieldErrors as ZodFieldErrors,
      message: null,
      values,
    }
  }

  try {
    await prisma.company.update({ where: { id }, data: result.data })
    updateTag('projects')
    revalidatePath('/admin/entreprises')
    log.info({ event: 'company:updated', slug: result.data.slug })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    const mapped = mapUniqueViolation(err, values)
    if (mapped) return mapped

    log.error({ err, event: 'company:update_failed' })
    return { ok: false, errors: {}, message: 'unknown_error', values }
  }
}

export async function deleteCompany(id: string): Promise<CompanyFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('deleteCompany')

  try {
    await prisma.company.delete({ where: { id } })
    updateTag('projects')
    revalidatePath('/admin/entreprises')
    log.info({ event: 'company:deleted', id })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    if (hasCode(err, 'P2003')) {
      return { ok: false, errors: {}, message: 'company_in_use' }
    }
    log.error({ err, event: 'company:delete_failed' })
    return { ok: false, errors: {}, message: 'unknown_error' }
  }
}
```

`parseFormData` construit l'objet champ par champ au lieu d'utiliser `Object.fromEntries`, qui écraserait les secteurs multiples en ne gardant que le dernier.

`await getCurrentUser()` ouvre chaque action, hors du `try`, comme au sub-project `07` et pour la même raison : une action exportée est joignable sans passer par la page.

`data: result.data` n'inclut pas `logoFilename`, donc une modification laisse le logo intact. Ni `createCompany` ni `updateCompany` ne renvoient d'identifiant : le composant appelant redirige vers la liste sur `state.ok === true`, il n'a besoin de rien d'autre.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run --project unit src/server/actions/companies.test.ts`
Expected: PASS, dix-neuf cas verts.

---

### Task 3 : Requêtes d'administration

**Files:**
- Create: `src/server/queries/companies.ts`

**Interfaces:**
- Consomme : `prisma`.
- Produit : `findAllCompaniesForAdmin()`, `findCompanyByIdForAdmin(id)`, `findAvailableLegalEntities(currentId?)`, le type `AdminCompany`, consommés par les Tasks 6 et 7.

- [ ] **Step 1: Écrire les requêtes**

```typescript
import 'server-only'

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@/generated/prisma/client'

const legalEntitySelect = { legalEntity: { select: { id: true, name: true } } } as const

export type AdminCompany = Prisma.CompanyGetPayload<{
  include: typeof legalEntitySelect & { _count: { select: { clientMetas: true } } }
}>

export async function findAllCompaniesForAdmin(): Promise<AdminCompany[]> {
  return prisma.company.findMany({
    include: { ...legalEntitySelect, _count: { select: { clientMetas: true } } },
    orderBy: { name: 'asc' },
  })
}

export async function findCompanyByIdForAdmin(id: string) {
  return prisma.company.findUnique({
    where: { id },
    include: legalEntitySelect,
  })
}

export async function findAvailableLegalEntities(currentId?: string) {
  return prisma.legalEntity.findMany({
    where: {
      OR: [{ company: null }, ...(currentId ? [{ company: { id: currentId } }] : [])],
    },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })
}
```

`_count.clientMetas` sert deux fois : la colonne Projets de la table, et le filtre de la vue « Travaillées » (`_count.clientMetas > 0`), qui n'a donc pas besoin d'une requête séparée.

`findAvailableLegalEntities` ne propose que les entités libres, plus celle déjà rattachée à l'entreprise en cours d'édition. Sans cette seconde branche, modifier une entreprise perdrait son entité légale, puisqu'elle n'apparaîtrait pas dans le select.

Ni `'use cache'` ni filtre, comme pour les tags : l'administration voit tout, immédiatement.

- [ ] **Step 2: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur.

---

### Task 4 : Sélecteur de colonnes générique du `DataTable`

**Files:**
- Modify: `src/components/features/admin/DataTable.tsx`
- Modify: `src/components/features/admin/tags/TagsTable.tsx`

**Interfaces:**
- Consomme : rien de nouveau.
- Produit : `Column<T>.hideable`, `Column<T>.defaultVisible`, consommés par la Task 7 (`CompaniesTable`), par `TagsTable` dans cette même task, et plus tard par le `12`.

> Composant partagé déjà écrit au `07` : cette task le prolonge, elle ne le réécrit pas. L'écran des tags, qui ne déclare aucune colonne `hideable`, doit continuer de fonctionner sans le `Popover` Colonnes.

- [ ] **Step 1: Étendre `Column<T>`**

```typescript
export interface Column<T> {
  key: string
  header: string
  width: string
  align?: "right"
  className?: string
  cell: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  searchValue?: (row: T) => string
  // Colonne proposée dans le Popover "Colonnes" ; les autres restent toujours affichées.
  hideable?: boolean
  // Visible par défaut si hideable (true si omis).
  defaultVisible?: boolean
}
```

- [ ] **Step 2: Ajouter l'état et la liste dérivée des colonnes visibles**

Sous les autres `useState` du composant, avant `searchFilteredRows` dont le filtrage doit exclure les colonnes masquées :

```typescript
const hideableColumns = useMemo(() => columns.filter((column) => column.hideable), [columns])

const [hiddenColumnKeys, setHiddenColumnKeys] = useState<Set<string>>(
  () => new Set(hideableColumns.filter((column) => column.defaultVisible === false).map((c) => c.key)),
)
const [columnsOpen, setColumnsOpen] = useState(false)

const visibleColumns = useMemo(
  () => columns.filter((column) => !hiddenColumnKeys.has(column.key)),
  [columns, hiddenColumnKeys],
)

function toggleColumn(key: string) {
  setHiddenColumnKeys((prev) => {
    const next = new Set(prev)
    if (next.has(key)) {
      next.delete(key)
    } else {
      next.add(key)
      // Une colonne masquée ne peut pas rester triée : aria-sort sur une colonne invisible.
      setSort((current) => (current?.key === key ? null : current))
    }
    return next
  })
}

function resetColumns() {
  setHiddenColumnKeys(new Set())
}
```

- [ ] **Step 3: Remplacer `columns` par `visibleColumns` dans le rendu et la recherche**

Quatre remplacements mécaniques dans le corps déjà existant :
- `searchFilteredRows` : `columns.some(...)` → `visibleColumns.some(...)` (une colonne masquée sort aussi de la recherche, pour qu'une ligne ne remonte jamais sur un critère invisible à l'écran)
- l'en-tête (`<TableRow>` de `TableHeader`) : `columns.map((column, index) => renderHeaderCell(column, index === columns.length - 1))` → `visibleColumns.map((column, index) => renderHeaderCell(column, index === visibleColumns.length - 1))`
- `renderDataRow` : `columns.map((column, index) => ...)` et `index === columns.length - 1` → `visibleColumns.map(...)` et `visibleColumns.length - 1`
- les deux `colSpan={columns.length + 1}` (ligne « Aucun résultat » et ligne de groupe) → `colSpan={visibleColumns.length + 1}`

- [ ] **Step 4: Ajouter le `Popover` Colonnes dans la barre d'outils**

Entre l'`Input` de recherche et le `Popover` Filtres existant, dans cet ordre :

```tsx
import { Columns3, Funnel, Search /* … */ } from "lucide-react"

{hideableColumns.length > 0 ? (
  <Popover open={columnsOpen} onOpenChange={setColumnsOpen}>
    <PopoverTrigger asChild>
      <Button type="button" variant="outline" size="sm">
        <Columns3 aria-hidden data-icon="inline-start" />
        Colonnes
        {hiddenColumnKeys.size > 0 ? (
          <Badge variant="secondary">{hiddenColumnKeys.size}</Badge>
        ) : null}
      </Button>
    </PopoverTrigger>
    <PopoverContent align="start" className="gap-0">
      <div className="grid gap-[2px]">
        {hideableColumns.map((column) => {
          const checked = !hiddenColumnKeys.has(column.key)
          return (
            <label
              key={column.key}
              className="-mx-2 flex h-8 cursor-pointer items-center gap-2 rounded-sm px-2 text-sm hover:bg-accent hover:text-accent-foreground"
            >
              <Checkbox
                checked={checked}
                onCheckedChange={() => {
                  toggleColumn(column.key)
                }}
              />
              <span>{column.header}</span>
            </label>
          )
        })}
      </div>
      <Separator className="mt-3 mb-2" />
      <div className="flex items-center justify-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={hiddenColumnKeys.size === 0}
          onClick={resetColumns}
        >
          Réinitialiser
        </Button>
        <Button type="button" variant="default" size="sm" onClick={() => setColumnsOpen(false)}>
          Appliquer
        </Button>
      </div>
    </PopoverContent>
  </Popover>
) : null}
```

Même pied Réinitialiser / Appliquer que le `Popover` Filtres, pour que les deux panneaux se comportent à l'identique.

- [ ] **Step 5: Déclarer les colonnes masquables de l'écran des tags**

Le sélecteur de colonnes livré aux Steps 1 à 4 s'applique aussi à l'écran déjà en place. Dans `src/components/features/admin/tags/TagsTable.tsx`, ajouter `hideable: true, defaultVisible: true` aux colonnes `nameEn`, `kind`, `icon` et `usage`. Slug, Nom (FR) et Actions restent sans ces deux propriétés : elles ne rejoignent jamais le `Popover` Colonnes, au même titre que Nom, Projets et Actions pour les entreprises (Task 7).

- [ ] **Step 6: Vérifier l'écran des tags**

```bash
just typecheck && just lint && just test-unit
```

Expected: aucune erreur ; le `Popover` Colonnes apparaît sur `/admin/tags` avec quatre entrées, toutes cochées par défaut.

---

### Task 5 : Combobox à sélection multiple, partagé

**Files:**
- Create: `src/components/features/admin/MultiSelectCombobox.tsx`

**Interfaces:**
- Consomme : `Command`, `Popover`, `Badge` (registry).
- Produit : `<MultiSelectCombobox options={{value,label}[]} selected={string[]} onChange={(next: string[]) => void} name={string} ... />`, consommé par la Task 6.

- [ ] **Step 1: Écrire le composant**

```typescript
"use client"

import { useMemo, useState } from "react"
import { ChevronsUpDown, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface ComboboxOption {
  value: string
  label: string
}

interface Props {
  id: string
  name: string
  options: readonly ComboboxOption[]
  selected: readonly string[]
  onChange: (next: string[]) => void
  placeholder: string
  searchPlaceholder: string
  emptyMessage: string
  ariaInvalid?: boolean
  ariaDescribedby?: string
}

export function MultiSelectCombobox({
  id,
  name,
  options,
  selected,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyMessage,
  ariaInvalid,
  ariaDescribedby,
}: Props) {
  const [open, setOpen] = useState(false)
  const labelByValue = useMemo(() => new Map(options.map((option) => [option.value, option.label])), [options])

  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value])
  }

  return (
    <div className="flex flex-col gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            id={id}
            aria-expanded={open}
            aria-invalid={ariaInvalid}
            aria-describedby={ariaDescribedby}
            className="w-full justify-between font-normal"
          >
            <span className="text-muted-foreground">{placeholder}</span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-(--radix-popper-anchor-width) p-0">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    keywords={[option.label]}
                    data-checked={selected.includes(option.value)}
                    onSelect={() => {
                      toggle(option.value)
                    }}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((value) => (
            <Badge key={value} variant="secondary" className="gap-1">
              {labelByValue.get(value) ?? value}
              <button
                type="button"
                aria-label={`Retirer ${labelByValue.get(value) ?? value}`}
                onClick={() => {
                  toggle(value)
                }}
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      ) : null}

      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
    </div>
  )
}
```

Le déclencheur garde toujours son `placeholder` : contrairement à un `Select`, il n'affiche pas la sélection courante, qui se lit dans les badges en dessous. `value={option.value}` sur `CommandItem`, avec `keywords={[option.label]}` pour que la recherche `cmdk` matche aussi sur le libellé affiché : `onSelect` reçoit alors la clé technique (`'SAAS'`), pas le texte humain, directement utilisable par `toggle`.

Un `input type="hidden"` par valeur choisie : c'est ce qui produit plusieurs entrées `FormData` pour la même clé `name`, lues par `getAll` côté serveur.

- [ ] **Step 2: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 6 : Formulaire entreprise, écran plein

**Files:**
- Create: `src/components/features/admin/companies/CompanyForm.tsx`
- Create: `src/components/layout/AdminBreadcrumb.tsx`
- Create: `src/app/admin/(protected)/entreprises/nouvelle/page.tsx`
- Create: `src/app/admin/(protected)/entreprises/[id]/page.tsx`
- Create: `src/components/ui/breadcrumb.tsx` (`pnpm dlx shadcn@latest add breadcrumb`, seulement s'il est absent)

**Interfaces:**
- Consomme : `createCompany`, `updateCompany` (Task 2), `findCompanyByIdForAdmin`, `findAvailableLegalEntities` (Task 3), `companySchema`, `NONE_VALUE`, `COMPANY_SECTORS`, `COMPANY_SIZES` (Task 1), `MultiSelectCombobox` (Task 5).
- Produit : `AdminBreadcrumb`, composant partagé réutilisé tel quel par le formulaire projet du sub-project `13`. Les routes `/admin/entreprises/nouvelle` et `/admin/entreprises/[id]`, consommées par la Task 7 (liens depuis la liste).

- [ ] **Step 1: Installer `breadcrumb` si absent**

```bash
ls src/components/ui/breadcrumb.tsx 2>/dev/null || pnpm dlx shadcn@latest add breadcrumb
```

- [ ] **Step 2: Écrire `AdminBreadcrumb`, fil d'ariane partagé**

Composant générique, sans rien de propre aux entreprises : chaque appelant lui fournit sa propre liste d'items, ce formulaire comme celui du sub-project `13`.

```typescript
import Link from "next/link"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"

export type BreadcrumbEntry = { label: string; href?: string }

export function AdminBreadcrumb({ items }: { items: BreadcrumbEntry[] }) {
  return (
    <Breadcrumb>
      <BreadcrumbList>
        {items.map((item, index) => (
          <BreadcrumbItem key={item.label}>
            {item.href && index < items.length - 1 ? (
              <>
                <BreadcrumbLink asChild>
                  <Link href={item.href}>{item.label}</Link>
                </BreadcrumbLink>
                <BreadcrumbSeparator />
              </>
            ) : (
              <BreadcrumbPage>{item.label}</BreadcrumbPage>
            )}
          </BreadcrumbItem>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  )
}
```

- [ ] **Step 3: Écrire `CompanyForm`**

```typescript
"use client"

import { startTransition, useActionState, useEffect, useId, useState, type SubmitEvent } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Save } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FormField } from "@/components/ui/form-field"
import { Input } from "@/components/ui/input"
import { MultiSelectCombobox } from "@/components/features/admin/MultiSelectCombobox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import type { Company, LegalEntity } from "@/generated/prisma/client"
import { COMPANY_SECTORS, COMPANY_SIZES, NONE_VALUE } from "@/lib/schemas/company"
import { createCompany, updateCompany } from "@/server/actions/companies"
import { initialCompanyFormState } from "@/server/actions/companies.types"

// Dérivés directement de l'enum Prisma, jamais de la liste (différente) de la maquette.
const SECTOR_LABELS: Record<(typeof COMPANY_SECTORS)[number], string> = {
  ASSURANCE: "Assurance",
  FINTECH: "Fintech",
  SAAS: "SaaS",
  SERVICES_RH: "Services RH",
  ESN_CONSEIL: "ESN / Conseil",
  LOGICIELS_ENTREPRISE: "Logiciels d'entreprise",
  ECOMMERCE: "E-commerce",
  IA_AUTOMATISATION: "IA / Automatisation",
  EMARKETING: "E-marketing",
  BANQUE: "Banque",
  AUTRE: "Autre",
}
const SECTOR_OPTIONS = COMPANY_SECTORS.map((value) => ({ value, label: SECTOR_LABELS[value] }))

const SIZE_LABELS: Record<(typeof COMPANY_SIZES)[number], string> = {
  TPE: "TPE",
  PME: "PME",
  ETI: "ETI",
  GROUPE: "Groupe",
}

interface Props {
  company: Company | null
  legalEntities: Pick<LegalEntity, "id" | "name">[]
}

export function CompanyForm({ company, legalEntities }: Props) {
  const router = useRouter()
  const formId = useId()
  const action = company ? updateCompany.bind(null, company.id) : createCompany
  const [state, formAction, pending] = useActionState(action, initialCompanyFormState)
  const [sectors, setSectors] = useState<string[]>(company?.sectors ?? [])

  useEffect(() => {
    if (state.ok === true) {
      toast.success(company ? "Entreprise mise à jour" : "Entreprise créée")
      router.push("/admin/entreprises")
    } else if (state.ok === false && state.message === "unknown_error") {
      toast.error("Une erreur est survenue, réessayez")
    }
  }, [state, company, router])

  function handleSubmit(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    startTransition(() => {
      formAction(formData)
    })
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-sans text-2xl font-semibold tracking-tight">
          {company ? company.name : "Nouvelle entreprise"}
        </h1>
        <div className="flex gap-2">
          <Button type="button" variant="ghost" asChild>
            <Link href="/admin/entreprises">Annuler</Link>
          </Button>
          <Button type="submit" disabled={pending}>
            <Save aria-hidden data-icon="inline-start" />
            {pending ? "Enregistrement..." : "Enregistrer"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Identité</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field id={`${formId}-slug`} label="Slug" errors={state.errors.slug}>
            <Input
              id={`${formId}-slug`}
              name="slug"
              defaultValue={company?.slug ?? ""}
              placeholder="axa"
              aria-invalid={!!state.errors.slug?.length}
              aria-describedby={`${formId}-slug-error`}
            />
          </Field>
          <Field id={`${formId}-name`} label="Nom" errors={state.errors.name}>
            <Input
              id={`${formId}-name`}
              name="name"
              defaultValue={company?.name ?? ""}
              aria-invalid={!!state.errors.name?.length}
              aria-describedby={`${formId}-name-error`}
            />
          </Field>
          <Field id={`${formId}-websiteUrl`} label="Site web" errors={state.errors.websiteUrl}>
            <Input
              id={`${formId}-websiteUrl`}
              name="websiteUrl"
              type="url"
              defaultValue={company?.websiteUrl ?? ""}
              placeholder="https://"
              aria-invalid={!!state.errors.websiteUrl?.length}
              aria-describedby={`${formId}-websiteUrl-error`}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Classification</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <Field id={`${formId}-sectors`} label="Secteurs" errors={state.errors.sectors}>
            <MultiSelectCombobox
              id={`${formId}-sectors`}
              name="sectors"
              options={SECTOR_OPTIONS}
              selected={sectors}
              onChange={setSectors}
              placeholder="Ajouter un secteur"
              searchPlaceholder="Chercher un secteur"
              emptyMessage="Aucun secteur ne correspond."
              ariaInvalid={!!state.errors.sectors?.length}
              ariaDescribedby={`${formId}-sectors-error`}
            />
          </Field>
          <Field id={`${formId}-size`} label="Taille" errors={state.errors.size}>
            <Select name="size" defaultValue={company?.size ?? NONE_VALUE}>
              <SelectTrigger
                id={`${formId}-size`}
                className="w-full"
                aria-invalid={!!state.errors.size?.length}
                aria-describedby={`${formId}-size-error`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Non renseignée</SelectItem>
                {COMPANY_SIZES.map((size) => (
                  <SelectItem key={size} value={size}>
                    {SIZE_LABELS[size]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Entité légale</CardTitle>
        </CardHeader>
        <CardContent>
          <Field id={`${formId}-legalEntityId`} label="Entité légale" errors={state.errors.legalEntityId}>
            <Select name="legalEntityId" defaultValue={company?.legalEntityId ?? NONE_VALUE}>
              <SelectTrigger
                id={`${formId}-legalEntityId`}
                className="w-full"
                aria-invalid={!!state.errors.legalEntityId?.length}
                aria-describedby={`${formId}-legalEntityId-error`}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Aucune</SelectItem>
                {legalEntities.map((entity) => (
                  <SelectItem key={entity.id} value={entity.id}>
                    {entity.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </CardContent>
      </Card>
    </form>
  )
}

function Field({
  id,
  label,
  errors,
  children,
}: {
  id: string
  label: string
  errors?: string[]
  children: React.ReactNode
}) {
  return (
    <FormField
      id={id}
      label={label}
      error={errors?.[0] ? <p className="text-sm text-destructive">{errors[0]}</p> : null}
    >
      {children}
    </FormField>
  )
}
```

Le formulaire tient en une seule colonne de `Card` : les cartes Relation, Logo et Notes de la maquette portent des champs hors périmètre, rien ne justifie ici sa disposition à deux colonnes.

`onSubmit` + `startTransition`, jamais `<form action>` : ce formulaire porte deux `Select` (Taille, Entité légale), que React réinitialiserait à leur valeur du premier rendu à la première erreur de validation.

- [ ] **Step 4: Écrire la page de création**

```typescript
import { Suspense } from "react"

import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { CompanyForm } from "@/components/features/admin/companies/CompanyForm"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAvailableLegalEntities } from "@/server/queries/companies"

async function NewCompanySection() {
  const legalEntities = await findAvailableLegalEntities()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: "Entreprises", href: "/admin/entreprises" },
          { label: "Nouvelle entreprise" },
        ]}
      />
      <CompanyForm company={null} legalEntities={legalEntities} />
    </div>
  )
}

export default async function NewCompanyPage() {
  await getCurrentUser()

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={[24, 260, 160, 140]} />}>
        <NewCompanySection />
      </Suspense>
    </div>
  )
}
```

- [ ] **Step 5: Écrire la page de modification**

```typescript
import { notFound } from "next/navigation"
import { Suspense } from "react"

import { AdminBreadcrumb } from "@/components/layout/AdminBreadcrumb"
import { CompanyForm } from "@/components/features/admin/companies/CompanyForm"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAvailableLegalEntities, findCompanyByIdForAdmin } from "@/server/queries/companies"

async function EditCompanySection({ id }: { id: string }) {
  const [company, legalEntities] = await Promise.all([
    findCompanyByIdForAdmin(id),
    findAvailableLegalEntities(id),
  ])
  if (!company) notFound()

  return (
    <div className="flex flex-col gap-6">
      <AdminBreadcrumb
        items={[
          { label: "Entreprises", href: "/admin/entreprises" },
          { label: company.name },
        ]}
      />
      <CompanyForm company={company} legalEntities={legalEntities} />
    </div>
  )
}

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
  await getCurrentUser()
  const { id } = await params

  return (
    <div className="w-full px-4 py-6 md:px-6 lg:py-8">
      <Suspense fallback={<StackedSkeleton heights={[24, 260, 160, 140]} />}>
        <EditCompanySection id={id} />
      </Suspense>
    </div>
  )
}
```

`AdminBreadcrumb` vit dans le composant async, pas dans la page : sur l'écran de modification, son dernier item affiche `company.name`, une donnée qui n'existe qu'une fois la requête résolue, donc uniquement disponible sous `<Suspense>`.

`findCompanyByIdForAdmin` et `findAvailableLegalEntities(id)` partent en parallèle par `Promise.all` : la seconde ne dépend pas du résultat de la première, seul le `notFound()` en dépend.

- [ ] **Step 6: Vérifier que tout compile**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 7 : Écran de liste, avec ses vues

**Files:**
- Create: `src/components/features/admin/companies/CompaniesTable.tsx`
- Create: `src/components/features/admin/companies/DeleteCompanyDialog.tsx`
- Modify: `src/app/admin/(protected)/entreprises/page.tsx`
- Create: `src/app/admin/(protected)/entreprises/travaillees/page.tsx`

**Interfaces:**
- Consomme : `findAllCompaniesForAdmin` (Task 3), `deleteCompany` (Task 2), `DataTable` (Task 4).
- Produit : les écrans `/admin/entreprises` (Toutes) et `/admin/entreprises/travaillees` (Travaillées).

- [ ] **Step 1: Écrire la confirmation de suppression**

Composant client montant un `AlertDialog`, sur le modèle exact de `DeleteTagDialog` : `AlertDialogMedia` avec `TriangleAlert`, titre « Supprimer « {nom} » ? », description remplacée par le refus en `text-destructive` dès que `company._count.clientMetas > 0` (bouton désactivé), sinon tentative réelle via `deleteCompany(id)` et lecture de `state.message === 'company_in_use'`.

- [ ] **Step 2: Écrire la table**

```typescript
"use client"

import { useMemo } from "react"

import { DataTable, type Column } from "@/components/features/admin/DataTable"
import { DeleteCompanyDialog } from "@/components/features/admin/companies/DeleteCompanyDialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import type { AdminCompany } from "@/server/queries/companies"
import { Pencil } from "lucide-react"
import Link from "next/link"

const SECTOR_LABELS: Record<string, string> = {
  ASSURANCE: "Assurance",
  FINTECH: "Fintech",
  SAAS: "SaaS",
  SERVICES_RH: "Services RH",
  ESN_CONSEIL: "ESN / Conseil",
  LOGICIELS_ENTREPRISE: "Logiciels d'entreprise",
  ECOMMERCE: "E-commerce",
  IA_AUTOMATISATION: "IA / Automatisation",
  EMARKETING: "E-marketing",
  BANQUE: "Banque",
  AUTRE: "Autre",
}
const SIZE_LABELS: Record<string, string> = { TPE: "TPE", PME: "PME", ETI: "ETI", GROUPE: "Groupe" }

const columns: readonly Column<AdminCompany>[] = [
  {
    key: "name",
    header: "Nom",
    width: "w-[28%]",
    sortValue: (company) => company.name,
    searchValue: (company) => `${company.name} ${company.slug}`,
    cell: (company) => (
      <div className="flex flex-col">
        <span className="font-medium">{company.name}</span>
        <span className="font-mono text-xs text-muted-foreground">{company.slug}</span>
      </div>
    ),
  },
  {
    key: "sectors",
    header: "Secteurs",
    width: "w-[24%]",
    hideable: true,
    defaultVisible: true,
    cell: (company) => (
      <div className="flex flex-wrap gap-1">
        {company.sectors.map((sector) => (
          <Badge key={sector} variant="secondary">
            {SECTOR_LABELS[sector] ?? sector}
          </Badge>
        ))}
      </div>
    ),
  },
  {
    key: "size",
    header: "Taille",
    width: "w-[96px]",
    className: "font-mono text-muted-foreground",
    hideable: true,
    defaultVisible: true,
    cell: (company) => (company.size ? SIZE_LABELS[company.size] : "—"),
  },
  {
    key: "legalEntity",
    header: "Entité légale",
    width: "w-[160px]",
    className: "truncate text-muted-foreground",
    hideable: true,
    defaultVisible: true,
    cell: (company) => company.legalEntity?.name ?? "—",
  },
  {
    key: "projects",
    header: "Projets",
    width: "w-[96px]",
    align: "right",
    className: "font-mono tabular-nums text-muted-foreground",
    sortValue: (company) => company._count.clientMetas,
    cell: (company) => company._count.clientMetas,
  },
  {
    key: "actions",
    header: "Actions",
    width: "w-[88px]",
    align: "right",
    cell: (company) => (
      <span className="inline-flex gap-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`Modifier ${company.name}`} asChild>
              <Link href={`/admin/entreprises/${company.id}`}>
                <Pencil className="size-4" />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Modifier</TooltipContent>
        </Tooltip>
        <DeleteCompanyDialog company={company} />
      </span>
    ),
  },
]

interface Props {
  companies: readonly AdminCompany[]
}

export function CompaniesTable({ companies }: Props) {
  const memoColumns = useMemo(() => columns, [])

  return (
    <DataTable
      rows={companies}
      columns={memoColumns}
      getRowId={(company) => company.id}
      // Pas de displayOrder sur Company : la colonne # sert de rang stable, pas d'ordre éditable.
      orderValue={() => 0}
      searchPlaceholder="Rechercher un nom ou un slug"
      countLabel={(count) => (count === 1 ? "1 entreprise" : `${count} entreprises`)}
      empty="Aucune entreprise pour le moment. Créez-en une via le bouton ci-dessus."
    />
  )
}
```

Ni `groupBy`, ni `facets`, ni `onReorder` : `Company` ne porte pas de `displayOrder`, et les seules facettes que montre la maquette (statut de relation, type, zone) n'ont pas de colonne en base. `orderValue={() => 0}` rend toutes les lignes égales pour le tri stable interne du `DataTable`, qui conserve alors l'ordre alphabétique de la requête pour numéroter la colonne `#`, purement cosmétique ici puisqu'aucun glisser-déposer n'est proposé.

- [ ] **Step 3: Remplacer la page d'attente par la vue Toutes**

```typescript
import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { CompaniesTable } from "@/components/features/admin/companies/CompaniesTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllCompaniesForAdmin } from "@/server/queries/companies"

async function CompaniesSection() {
  const companies = await findAllCompaniesForAdmin()
  return <CompaniesTable companies={companies} />
}

export default async function AdminEntreprisesPage() {
  await getCurrentUser()

  return (
    <AdminPageShell
      title="Entreprises"
      subtitle="Toutes les entreprises du CRM."
      actions={
        <Button asChild>
          <Link href="/admin/entreprises/nouvelle">
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle entreprise
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<StackedSkeleton heights={[40, 40, 40, 40, 40]} />}>
        <CompaniesSection />
      </Suspense>
    </AdminPageShell>
  )
}
```

- [ ] **Step 4: Écrire la vue Travaillées**

Même structure, sur sa propre route : `_count.clientMetas` est déjà chargé pour la colonne Projets, filtrer côté serveur en mémoire évite une seconde requête Prisma pour la même donnée.

```typescript
import { Suspense } from "react"
import Link from "next/link"
import { Plus } from "lucide-react"

import { CompaniesTable } from "@/components/features/admin/companies/CompaniesTable"
import { AdminPageShell } from "@/components/layout/AdminPageShell"
import { Button } from "@/components/ui/button"
import { StackedSkeleton } from "@/components/ui/stacked-skeleton"
import { getCurrentUser } from "@/lib/get-current-user"
import { findAllCompaniesForAdmin } from "@/server/queries/companies"

async function WorkedCompaniesSection() {
  const companies = await findAllCompaniesForAdmin()
  const rows = companies.filter((company) => company._count.clientMetas > 0)
  return <CompaniesTable companies={rows} />
}

export default async function AdminEntreprisesTravailleesPage() {
  await getCurrentUser()

  return (
    <AdminPageShell
      title="Entreprises travaillées"
      subtitle="Celles qui figurent sur le site, via un projet client."
      actions={
        <Button asChild>
          <Link href="/admin/entreprises/nouvelle">
            <Plus aria-hidden data-icon="inline-start" />
            Nouvelle entreprise
          </Link>
        </Button>
      }
    >
      <Suspense fallback={<StackedSkeleton heights={[40, 40, 40, 40, 40]} />}>
        <WorkedCompaniesSection />
      </Suspense>
    </AdminPageShell>
  )
}
```

Deux routes distinctes, deux pages : navigant de l'une à l'autre, Next.js remonte le segment de page, donc `CompaniesTable`, sans recherche, tri ni page conservés de la vue précédente. Pas de `key` à poser à la main pour l'obtenir, contrairement à un filtre porté par un paramètre de recherche sur une route unique.

- [ ] **Step 5: Vérifier que tout compile**

```bash
just typecheck && just lint && just build
```

Expected: aucune erreur.

---

### Task 8 : Barre latérale complète

**Files:**
- Modify: `src/config/admin-nav-items.ts`
- Modify: `src/components/layout/AdminSidebar.tsx`
- Modify: `src/components/layout/AdminNavLink.tsx`
- Create: `src/components/layout/AdminNavSubLink.tsx`
- Create: `src/components/layout/AdminNavDisabledItem.tsx`

**Interfaces:**
- Consomme : `SidebarMenuButton`, `SidebarMenuSub`, `SidebarMenuSubItem`, `SidebarMenuSubButton` (déjà dans `src/components/ui/sidebar.tsx`, rien à installer).
- Produit : l'arborescence complète de la maquette dans `AdminSidebar`, consommée par tout l'epic.

> Les libellés, icônes et routes ci-dessous viennent de `navRef` dans `.design-sync/maquette/Espace admin.dc.html` (script, section `/* ---- navigation ---- */`). Les icônes citées existent toutes dans `lucide-react` (vérifié) ; celle de « Publications » est la marque LinkedIn (`@icons-pack/react-simple-icons`, vérifier le nom d'export exact au moment d'écrire l'import, le paquet étant ESM).

- [ ] **Step 1: Réécrire `admin-nav-items.ts`**

```typescript
import type { Route } from "next"
import type { ComponentType } from "react"
import {
  Briefcase,
  Building2,
  CalendarClock,
  ChartLine,
  ChartPie,
  Coins,
  Columns3,
  Folder,
  FolderKanban,
  House,
  ImageIcon,
  Landmark,
  MessageCircle,
  ReceiptEuro,
  Search,
  Send,
  ShieldCheck,
  Tags,
  User,
  UserPlus,
  Wallet,
} from "lucide-react"
// Nom d'export exact à vérifier au moment d'écrire le code (paquet ESM, non résolu par un simple
// require) : cette icône de marque n'est pas structurellement un LucideIcon, d'où le type large
// ci-dessous sur AdminNavItem.icon plutôt qu'un import spécifique de lucide-react.
import { SiLinkedin } from "@icons-pack/react-simple-icons"

type NavIcon = ComponentType<{ className?: string }>

export interface AdminNavSubItem {
  label: string
  href?: Route
}

export interface AdminNavItem {
  label: string
  icon: NavIcon
  href?: Route
  subItems?: readonly AdminNavSubItem[]
}

export interface AdminNavGroup {
  label?: string
  items: readonly AdminNavItem[]
}

export const ADMIN_NAV_GROUPS: readonly AdminNavGroup[] = [
  { items: [{ label: "Accueil", icon: House, href: "/admin" }] },
  {
    label: "Portfolio",
    items: [
      { label: "Projets", icon: FolderKanban, href: "/admin/projets" },
      { label: "Tags", icon: Tags, href: "/admin/tags" },
      { label: "Assets", icon: ImageIcon, href: "/admin/assets" },
    ],
  },
  {
    label: "Documents",
    items: [
      { label: "Bibliothèque", icon: Folder },
      { label: "Recherche", icon: Search },
    ],
  },
  {
    label: "CRM",
    items: [
      {
        label: "Entreprises",
        icon: Building2,
        href: "/admin/entreprises",
        subItems: [
          { label: "Toutes", href: "/admin/entreprises" },
          { label: "Travaillées", href: "/admin/entreprises/travaillees" },
          { label: "Recrutement" },
          { label: "Prospects" },
        ],
      },
      { label: "Leads", icon: UserPlus },
      { label: "Actions prospection", icon: Send },
      { label: "Revues hebdo", icon: CalendarClock },
      { label: "Entretiens", icon: MessageCircle },
      { label: "Contacts", icon: User },
    ],
  },
  {
    label: "Contenu",
    // Marque LinkedIn (Simple Icons), pas une icône Lucide : la nav représente ici la plateforme elle-même.
    items: [{ label: "Publications", icon: SiLinkedin }],
  },
  {
    label: "Suivi mission",
    // La maquette génère une entrée par mission cliente active (donnée hors du schéma actuel) :
    // représentée ici par une entrée générique unique, désactivée comme le reste du groupe.
    items: [{ label: "Missions", icon: Briefcase }],
  },
  {
    label: "Comptabilité",
    items: [
      { label: "Facturation", icon: ReceiptEuro },
      { label: "Déclarations", icon: Landmark },
    ],
  },
  {
    label: "Finances",
    items: [
      { label: "Trésorerie", icon: Wallet },
      { label: "Prévisionnel", icon: ChartLine },
      { label: "Budget", icon: Coins },
      { label: "Investissement", icon: ChartPie },
    ],
  },
  {
    label: "Dev",
    items: [
      { label: "Kanban", icon: Columns3 },
      { label: "Audits", icon: ShieldCheck },
    ],
  },
]

export function isAdminNavItemActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}
```

Remplacer l'icône de « Publications » par l'export Simple Icons de LinkedIn au moment d'écrire le code (`import { SiLinkedin } from "@icons-pack/react-simple-icons"` ou équivalent selon ce que le paquet expose réellement) : ce plan ne fige pas un nom d'export qu'il n'a pas pu vérifier en CommonJS.

- [ ] **Step 2: Écrire `AdminNavDisabledItem`**

```typescript
import type { ComponentType } from "react"

import { SidebarMenuButton } from "@/components/ui/sidebar"

// Même type large que AdminNavItem.icon (admin-nav-items.ts) : une icône de marque (Publications)
// n'est pas structurellement un LucideIcon.
type NavIcon = ComponentType<{ className?: string }>

export function AdminNavDisabledItem({ label, icon: Icon }: { label: string; icon?: NavIcon }) {
  return (
    <SidebarMenuButton aria-disabled tabIndex={-1} tooltip={label}>
      {Icon ? <Icon /> : null}
      <span>{label}</span>
    </SidebarMenuButton>
  )
}
```

`aria-disabled` suffit : `sidebarMenuButtonVariants` (`src/components/ui/sidebar.tsx`) porte déjà `aria-disabled:pointer-events-none aria-disabled:opacity-50`, le mécanisme que la maquette applique à ses propres entrées « à venir ». Pas de `Link`, donc rien à naviguer. `icon` est optionnel : une sous-entrée désactivée (Recrutement, Prospects) n'en porte pas, comme `AdminNavSubLink` n'en prend pas non plus, la maquette ne mettant d'icône que sur les entrées de premier niveau.

- [ ] **Step 3: Écrire `AdminNavSubLink`**

```typescript
"use client"

import type { Route } from "next"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { SidebarMenuSubButton } from "@/components/ui/sidebar"
import { useCloseMobileSidebar } from "@/hooks/use-close-mobile-sidebar"

export function AdminNavSubLink({ href, label }: { href: Route; label: string }) {
  const pathname = usePathname()
  const closeMobileSidebar = useCloseMobileSidebar()

  return (
    <SidebarMenuSubButton asChild isActive={pathname === href}>
      <Link href={href} onClick={closeMobileSidebar}>
        {label}
      </Link>
    </SidebarMenuSubButton>
  )
}
```

Chaque vue a sa propre route (`/admin/entreprises`, `/admin/entreprises/travaillees`, et plus tard `/admin/projets`, `/admin/projets/client`, `/admin/projets/perso`) : `usePathname()` seul suffit à déterminer la sous-entrée active, sans paramètre de recherche à lire ni `<Suspense>` local à poser.

- [ ] **Step 4: Étendre `AdminNavLink` aux entrées à sous-entrées**

Le composant existant reste inchangé pour une entrée sans `subItems`. Lui ajouter une prop optionnelle `subItems?: readonly AdminNavSubItem[]`, rendue sous le bouton principal dans un `SidebarMenuSub` quand la route est active :

```typescript
{subItems && isActive ? (
  <SidebarMenuSub>
    {subItems.map((sub) =>
      sub.href ? (
        <SidebarMenuSubItem key={sub.label}>
          <AdminNavSubLink href={sub.href} label={sub.label} />
        </SidebarMenuSubItem>
      ) : (
        <SidebarMenuSubItem key={sub.label}>
          <AdminNavDisabledItem label={sub.label} />
        </SidebarMenuSubItem>
      ),
    )}
  </SidebarMenuSub>
) : null}
```

- [ ] **Step 5: Réécrire `AdminSidebar`**

```typescript
import { AdminNavDisabledItem } from "@/components/layout/AdminNavDisabledItem"
import { AdminNavLink } from "@/components/layout/AdminNavLink"
import { AdminSidebarBrand } from "@/components/layout/AdminSidebarBrand"
import { AdminSignOutButton } from "@/components/layout/AdminSignOutButton"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { ADMIN_NAV_GROUPS } from "@/config/admin-nav-items"
import { LABEL_CLASS } from "@/lib/typography"

export function AdminSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="h-14 justify-center border-b border-sidebar-border px-4 group-data-[collapsible=icon]:px-2">
        <AdminSidebarBrand />
      </SidebarHeader>
      <SidebarContent>
        {ADMIN_NAV_GROUPS.map((group) => (
          <SidebarGroup key={group.label ?? "home"}>
            {group.label ? (
              <SidebarGroupLabel className={LABEL_CLASS}>{group.label}</SidebarGroupLabel>
            ) : null}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.label}>
                    {item.href ? (
                      <AdminNavLink href={item.href} label={item.label} subItems={item.subItems}>
                        <item.icon />
                        <span>{item.label}</span>
                      </AdminNavLink>
                    ) : (
                      <AdminNavDisabledItem label={item.label} icon={item.icon} />
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <AdminSignOutButton />
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
```

- [ ] **Step 6: Vérifier que tout compile**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 9 : Vérifier de bout en bout

**Files:** aucun fichier du dépôt.

- [ ] **Step 1: Créer une entreprise avec deux secteurs, en retirer un au Combobox**

Expected: un seul secteur enregistré au final. Les deux encore présents signaleraient que le retrait du badge ne met pas à jour l'état soumis.

- [ ] **Step 2: Vérifier les champs vides**

Créer une entreprise sans taille, sans site web et sans entité légale, puis inspecter la ligne en base.

```sql
SELECT size, "websiteUrl", "legalEntityId" FROM "freelance"."Company" WHERE slug = '<slug>';
```

Expected: les trois colonnes valent `NULL`, jamais une chaîne vide ni le sentinel `'aucune'`.

- [ ] **Step 3: Vérifier le refus d'un slug en double**

Expected: message sous le champ slug.

- [ ] **Step 4: Vérifier la discrimination des deux contraintes**

Rattacher une entité légale à une entreprise, puis tenter de rattacher la **même** entité à une autre entreprise, avec un slug inédit.

Expected: le message apparaît sous le champ d'entité légale, **pas** sous le slug.

- [ ] **Step 5: Vérifier la conservation de l'entité légale et du logo en édition**

Modifier une entreprise du seed déjà rattachée à une entité légale et porteuse d'un `logoFilename`, changer son nom, enregistrer.

```sql
SELECT "legalEntityId", "logoFilename" FROM "freelance"."Company" WHERE slug = '<slug>';
```

Expected: les deux valeurs sont inchangées.

- [ ] **Step 6: Vérifier le refus d'une URL hostile**

Dans le champ site web, saisir `javascript:alert(1)` et enregistrer.

Expected: la validation refuse, message sous le champ, aucune ligne écrite.

- [ ] **Step 7: Vérifier l'écran plein et le retour à la liste**

Depuis `/admin/entreprises`, cliquer « Nouvelle entreprise » : le fil d'ariane affiche « Entreprises > Nouvelle entreprise ». Enregistrer un formulaire valide.

Expected: retour sur `/admin/entreprises`, la nouvelle entreprise visible dans la liste.

- [ ] **Step 8: Vérifier la vue « Travaillées »**

Ouvrir la sous-entrée « Travaillées » depuis la barre latérale.

Expected: seules les entreprises avec au moins un projet client apparaissent. Revenir sur « Toutes » réaffiche tout le monde, recherche et page repartant à zéro.

- [ ] **Step 9: Vérifier le sélecteur de colonnes**

Décocher « Taille » dans le `Popover` Colonnes de la liste, cliquer Appliquer, puis trier sur une autre colonne.

Expected: la colonne Taille reste masquée après le tri. La rouvrir via « Réinitialiser » la fait réapparaître.

- [ ] **Step 10: Vérifier le refus de suppression d'une entreprise référencée**

Tenter de supprimer une entreprise rattachée à un projet client du seed.

Expected: message expliquant qu'elle est utilisée par des projets, affiché dès l'ouverture de la confirmation.

- [ ] **Step 11: Vérifier la répercussion publique**

Modifier le nom d'une entreprise référencée par un projet client, puis consulter `/fr/projets`.

Expected: le nouveau nom apparaît.

- [ ] **Step 12: Vérifier la barre latérale**

Parcourir les neuf groupes : Accueil, Projets, Tags, Entreprises (avec Toutes/Travaillées), Assets sont cliquables ; toutes les autres entrées, dont Recrutement et Prospects sous Entreprises, sont grisées et non cliquables.

- [ ] **Step 13: Lancer la suite complète**

```bash
just test
```

Expected: tous les tests verts.

- [ ] **Step 14: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): CRUD des entreprises, barre latérale complète et sélecteur de colonnes
```
