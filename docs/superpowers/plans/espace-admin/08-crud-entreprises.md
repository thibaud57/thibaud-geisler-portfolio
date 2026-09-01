# CRUD des entreprises — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gérer les entreprises clientes, avec un formulaire réutilisable depuis le formulaire projet.

**Architecture:** Le pattern du sub-project `07` est repris à l'identique pour les Server Actions et l'état de formulaire. Trois choses diffèrent : les secteurs forment un tableau lu avec `getAll`, deux contraintes d'unicité distinctes doivent être discriminées par `meta.target`, et le composant de formulaire reçoit son déclencheur et un rappel de succès pour être montable ailleurs que sur sa page.

**Tech Stack:** Next.js 16 Server Actions, Zod 4, Prisma 7, React 19 (`useActionState`), shadcn/ui, Vitest.

**Spec:** `docs/superpowers/specs/espace-admin/08-crud-entreprises-design.md`

## Global Constraints

- **TDD strict** sur les Server Actions, comme au sub-project `07`.
- Messages de validation **en français dans le schéma**, `useActionState` sans librairie de formulaire.
- `sectors` se lit avec **`formData.getAll('sectors')`**, jamais `get` : `get` ne renverrait que le premier secteur, silencieusement.
- Les deux `P2002` possibles se discriminent par **`meta.target`** : slug et entité légale portent chacun une contrainte d'unicité.
- `size`, `websiteUrl` et `legalEntityId` sont nullables : convertir `''` en `null`. `legalEntityId: ''` violerait la contrainte de clé étrangère.
- **Chaque Server Action ouvre par `await getCurrentUser()`**, hors de tout `try/catch`. Une action exportée est un endpoint HTTP invocable par quiconque connaît son identifiant : le layout protège l'affichage des pages, pas l'exécution des actions. `.claude/rules/nextjs/server-actions.md` l'impose deux fois, en « à faire » (défense en profondeur) et en « à éviter » (dépendre uniquement du proxy). L'appel doit précéder le `try`, sans quoi le `catch` avalerait l'interruption `unauthorized()` et transformerait un refus d'accès en `unknown_error`.
- Invalider **`updateTag('projects')`**, pas une étiquette propre aux entreprises : les pages publiques y accèdent par les projets. `updateTag` et non `revalidateTag`, pour la même raison qu'au sub-project `07` : le scénario 8 vérifie le nouveau nom sur la page publique dès la modification, ce qu'un profil `'max'` ne garantit pas au premier chargement.
- Ne pas toucher à `logoFilename`, qui devient éditable au sub-project `10`.
- `src/app/admin/entreprises/page.tsx` existe comme page d'attente : la **remplacer**.
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
}

enum CompanySector {
  ASSURANCE  FINTECH  SAAS  SERVICES_RH  ESN_CONSEIL  LOGICIELS_ENTREPRISE
  ECOMMERCE  IA_AUTOMATISATION  EMARKETING  BANQUE  AUTRE
}

enum CompanySize { TPE  PME  ETI  GROUPE }
```

`ClientMeta` référence `Company` avec `onDelete: Restrict`.

**Rules :** `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/shadcn-ui/components.md`, `.claude/rules/vitest/setup.md`.

---

### Task 1 : Schéma et types

**Files:**
- Create: `src/lib/schemas/company.ts`
- Create: `src/server/actions/companies.types.ts`

**Interfaces:**
- Consomme : rien.
- Produit : `companySchema`, `CompanyInput`, `CompanyFormState`, `initialCompanyFormState`, consommés par les Tasks 2 et 4.

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
    .union([z.enum(COMPANY_SIZES), z.literal('')])
    .transform((value) => (value === '' ? null : value)),
  websiteUrl: z
    .union([z.url("L'adresse du site n'est pas valide"), z.literal('')])
    .transform((value) => (value === '' ? null : value)),
  legalEntityId: z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : value)),
})

export type CompanyInput = z.infer<typeof companySchema>
```

Les trois `transform` vers `null` sont ce qui empêche la base de stocker des chaînes vides. Pour `legalEntityId`, c'est plus qu'une question de propreté : `''` ne correspond à aucune entité légale et violerait la contrainte de clé étrangère.

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
  createdId?: string
}

export const initialCompanyFormState: CompanyFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

`createdId` est ce qui permet au formulaire projet du sub-project `13` de sélectionner l'entreprise qu'il vient de créer, sans recharger la page et sans perdre la saisie en cours.

---

### Task 2 : Server Actions, en TDD

**Files:**
- Test: `src/server/actions/companies.test.ts`
- Create: `src/server/actions/companies.ts`

**Interfaces:**
- Consomme : `companySchema` (Task 1), `prisma`, `createActionLogger`.
- Produit : `createCompany`, `updateCompany`, `deleteCompany`, consommées par les Tasks 4 et 5.

- [ ] **Step 1: Écrire les tests qui échouent**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))
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
import { createCompany, deleteCompany } from './companies'
import { initialCompanyFormState } from './companies.types'

function buildFormData(
  overrides: Record<string, string> = {},
  sectors: string[] = ['SAAS'],
): FormData {
  const data = new FormData()
  const base = { slug: 'acme', name: 'Acme', size: '', websiteUrl: '', legalEntityId: '' }
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
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

  it('enregistre une taille vide en null', async () => {
    await createCompany(initialCompanyFormState, buildFormData({ size: '' }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ size: null }) }),
    )
  })

  it('refuse une adresse de site invalide', async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData({ websiteUrl: 'pas-une-url' }))

    expect(state.errors.websiteUrl).toBeDefined()
  })

  it('enregistre une entité légale vide en null', async () => {
    await createCompany(initialCompanyFormState, buildFormData({ legalEntityId: '' }))

    expect(prisma.company.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ legalEntityId: null }) }),
    )
  })

  it("invalide l'étiquette projects après une création réussie", async () => {
    await createCompany(initialCompanyFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith('projects')
  })

  it("retourne l'identifiant créé", async () => {
    const state = await createCompany(initialCompanyFormState, buildFormData())

    expect(state.createdId).toBe('c1')
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

Les deux derniers tests de `createCompany` sont ceux qui comptent le plus : ils vérifient qu'une même erreur `P2002` aboutit sous deux champs différents selon sa cible. Sans cette discrimination, on afficherait « ce slug est déjà pris » alors que le problème vient de l'entité légale.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run --project unit src/server/actions/companies.test.ts`
Expected: FAIL, le module `./companies` n'existe pas.

- [ ] **Step 3: Écrire les Server Actions**

```typescript
'use server'

import 'server-only'
import { updateTag } from 'next/cache'

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
    const company = await prisma.company.create({ data: result.data })
    updateTag('projects')
    log.info({ event: 'company:created', slug: result.data.slug })
    return { ok: true, errors: {}, message: null, createdId: company.id }
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
    log.info({ event: 'company:updated', slug: result.data.slug })
    return { ok: true, errors: {}, message: null, createdId: id }
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

`parseFormData` construit l'objet champ par champ au lieu d'utiliser `Object.fromEntries`, qui écraserait les secteurs multiples en ne gardant que le dernier. C'est la différence de forme avec les tags.

`await getCurrentUser()` ouvre chaque action, hors du `try`, comme au sub-project `07` et pour la même raison : une action exportée est joignable sans passer par la page.

`data: result.data` n'inclut pas `logoFilename`, donc une modification laisse le logo intact.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run --project unit src/server/actions/companies.test.ts`
Expected: PASS, dix-huit cas verts.

---

### Task 3 : Requêtes d'administration

**Files:**
- Create: `src/server/queries/companies.ts`

**Interfaces:**
- Consomme : `prisma`.
- Produit : `findAllCompaniesForAdmin()` et `findAvailableLegalEntities(currentId?)`, consommées par les Tasks 4 et 5.

- [ ] **Step 1: Écrire les requêtes**

```typescript
import 'server-only'

import { prisma } from '@/lib/prisma'

export async function findAllCompaniesForAdmin() {
  return prisma.company.findMany({
    include: { legalEntity: { select: { id: true, name: true } } },
    orderBy: { name: 'asc' },
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

`findAvailableLegalEntities` ne propose que les entités libres, plus celle déjà rattachée à l'entreprise en cours d'édition. Sans cette seconde branche, modifier une entreprise perdrait son entité légale, puisqu'elle n'apparaîtrait pas dans le select.

Ni `'use cache'` ni filtre, comme pour les tags : l'administration voit tout, immédiatement.

- [ ] **Step 2: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur.

---

### Task 4 : Formulaire réutilisable

**Files:**
- Create: `src/components/features/admin/companies/CompanyFormDialog.tsx`

**Interfaces:**
- Consomme : `createCompany`, `updateCompany` (Task 2), `findAvailableLegalEntities` (Task 3), `companySchema` (Task 1).
- Produit : `<CompanyFormDialog company={Company | null} legalEntities={{id, name}[]} trigger={ReactNode} onCreated={(id: string) => void} />`, monté par la Task 5 et, plus tard, par le sub-project `13`.

> C'est le seul composant de ce sub-project conçu pour deux points de montage. Sa signature est donc contrainte, et le sub-project `13` en dépend.

- [ ] **Step 1: Écrire le formulaire**

Composant client montant un `Dialog` shadcn. Points imposés :

- **le déclencheur est une prop**, `trigger`, et non un bouton rendu en dur. Sur l'écran de liste ce sera « Nouvelle entreprise », dans le formulaire projet un bouton d'ajout à côté du select
- **`onCreated` est appelé au succès** avec l'identifiant issu de `state.createdId`. C'est ce qui permettra au formulaire projet de sélectionner l'entreprise sans recharger la page
- `const [state, formAction, pending] = useActionState(action, initialCompanyFormState)`, `action` valant `createCompany` ou `updateCompany.bind(null, company.id)`
- les secteurs sont des cases à cocher partageant toutes `name="sectors"` : c'est ce qui produit plusieurs valeurs pour la même clé, lues par `getAll` côté serveur
- la taille et l'entité légale sont des selects avec une première option vide
- chaque champ rend son erreur sous lui depuis `state.errors`
- les valeurs sont repeuplées depuis `state.values` en cas d'échec
- un `useEffect` sur `state.ok` ferme la modale, déclenche un toast et appelle `onCreated`

- [ ] **Step 2: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 5 : Écran de liste

**Files:**
- Create: `src/components/features/admin/companies/CompaniesTable.tsx`
- Create: `src/components/features/admin/companies/DeleteCompanyDialog.tsx`
- Modify: `src/app/admin/entreprises/page.tsx`

**Interfaces:**
- Consomme : `findAllCompaniesForAdmin` (Task 3), `deleteCompany` (Task 2), `<CompanyFormDialog />` (Task 4).
- Produit : l'écran `/admin/entreprises` complet.

- [ ] **Step 1: Écrire la confirmation de suppression**

Composant client montant un `AlertDialog`. Il appelle `deleteCompany(id)` et affiche, quand `state.message` vaut `company_in_use`, un message expliquant que l'entreprise est référencée par des projets et ne peut pas être supprimée.

- [ ] **Step 2: Écrire la table**

Table shadcn avec les colonnes : nom, slug, secteurs (en `Badge` multiples), taille, entité légale, et une colonne d'actions portant l'édition et la suppression.

- [ ] **Step 3: Remplacer la page d'attente**

```typescript
import { CompaniesTable } from '@/components/features/admin/companies/CompaniesTable'
import { CompanyFormDialog } from '@/components/features/admin/companies/CompanyFormDialog'
import { Button } from '@/components/ui/button'
import { findAllCompaniesForAdmin, findAvailableLegalEntities } from '@/server/queries/companies'

export default async function AdminEntreprisesPage() {
  const [companies, legalEntities] = await Promise.all([
    findAllCompaniesForAdmin(),
    findAvailableLegalEntities(),
  ])

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Entreprises</h1>
        <CompanyFormDialog
          company={null}
          legalEntities={legalEntities}
          trigger={<Button>Nouvelle entreprise</Button>}
        />
      </div>
      <div className="mt-6">
        <CompaniesTable companies={companies} legalEntities={legalEntities} />
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Vérifier que tout compile**

```bash
just typecheck && just lint && just build
```

Expected: aucune erreur.

---

### Task 6 : Vérifier de bout en bout

**Files:** aucun fichier du dépôt.

- [ ] **Step 1: Créer une entreprise avec deux secteurs**

Expected: elle apparaît dans la liste avec ses deux secteurs. Un seul secteur enregistré signifierait que la lecture se fait par `get` au lieu de `getAll`.

- [ ] **Step 2: Vérifier les champs vides**

Créer une entreprise sans taille, sans site web et sans entité légale, puis inspecter la ligne en base.

```sql
SELECT size, "websiteUrl", "legalEntityId" FROM "Company" WHERE slug = '<slug>';
```

Expected: les trois colonnes valent `NULL`, jamais une chaîne vide.

- [ ] **Step 3: Vérifier le refus d'un slug en double**

Expected: message sous le champ slug.

- [ ] **Step 4: Vérifier la discrimination des deux contraintes**

Rattacher une entité légale à une entreprise, puis tenter de rattacher la **même** entité à une autre entreprise, avec un slug inédit.

Expected: le message apparaît sous le champ d'entité légale, **pas** sous le slug. C'est le point le plus facile à rater : les deux erreurs portent le même code Prisma.

- [ ] **Step 5: Vérifier la conservation de l'entité légale en édition**

Modifier une entreprise déjà rattachée à une entité légale, sans toucher à ce champ, puis enregistrer.

Expected: le rattachement est conservé. Sa perte signalerait que `findAvailableLegalEntities` n'inclut pas l'entité courante.

- [ ] **Step 6: Vérifier la conservation du logo**

Modifier une entreprise du seed qui porte un `logoFilename`, changer son nom, enregistrer.

```sql
SELECT "logoFilename" FROM "Company" WHERE slug = '<slug>';
```

Expected: la valeur est inchangée. Le sub-project `10` rendra ce champ éditable, celui-ci ne doit pas l'écraser.

- [ ] **Step 7: Vérifier le refus de suppression d'une entreprise référencée**

Tenter de supprimer une entreprise rattachée à un projet client du seed.

Expected: message expliquant qu'elle est utilisée par des projets, sans altération de la donnée.

- [ ] **Step 8: Vérifier la répercussion publique**

Modifier le nom d'une entreprise référencée par un projet client, puis consulter `/fr/projets`.

Expected: le nouveau nom apparaît. Son absence signalerait que `updateTag('projects')` n'a pas été appelé, ou qu'on a invalidé une étiquette sans rapport.

- [ ] **Step 9: Lancer la suite complète**

```bash
just test
```

Expected: tous les tests verts.

- [ ] **Step 10: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): CRUD des entreprises
```
