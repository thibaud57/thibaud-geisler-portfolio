# Server Actions des projets — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer, modifier et supprimer un projet avec sa méta client et ses tags, dans une transaction, en maintenant une suite d'affichage continue de 1 à n sur l'ensemble des projets.

**Architecture:** Un schéma Zod à validation conditionnelle porte la règle que la base ne peut pas exprimer : un projet client exige une entreprise et un mode de travail, un projet personnel n'en a pas. Les écritures sur les trois tables passent par une transaction unique, les tags sont remplacés intégralement plutôt que rapprochés, et `Project.displayOrder` est maintenu 1..n par réutilisation de `src/lib/reorder.ts`, sur le modèle déjà posé par `src/server/actions/tags.ts`.

**Tech Stack:** Next.js 16 Server Actions, Zod 4, Prisma 7, Vitest.

**Spec:** `docs/superpowers/specs/espace-admin/11-crud-projets-actions-design.md`

## Global Constraints

- **TDD strict** : les mutations de l'espace admin sont sous TDD complet dans la stratégie du projet.
- La cohérence entre `type` et `clientMeta` est portée par **Zod**, pas par la base : `clientMeta` y est simplement optionnel.
- Toute création ou modification passe par **`prisma.$transaction`** : trois tables sont écrites.
- Les tags sont **remplacés intégralement** à la modification, jamais rapprochés. `ProjectTag.displayOrder` vaut **`index + 1`**, jamais `index` : la suite démarre à 1, comme `Tag.displayOrder`.
- `formats` se lit avec **`getAll`** : `get` ne conserverait que la première valeur.
- `workMode` est **requis** dans `ClientMeta`, contrairement à `teamSize` et `contractStatus`.
- Le passage de `CLIENT` à `PERSONAL` **supprime la méta client**. C'est assumé, et le formulaire du sub-project `13` devra avertir.
- **`Project.displayOrder` forme une suite globale 1..n sur l'ensemble des projets**, tous types confondus, et non une suite par `type` : c'est la même liste que sert la page publique `/projets`. Voir spec § Décision : portée de l'ordre d'affichage des projets.
- **`Project.displayOrder` et `ProjectTag.displayOrder` démarrent à 1, pas 0.** Une migration décale les données existantes d'un cran, du même geste que `prisma/migrations/20260917151326_tag_display_order_from_one` pour `Tag.displayOrder`.
- **La création, la modification et la suppression réutilisent `computeIdsAtPosition`, `removeId` et `sameIdSet` de `src/lib/reorder.ts`**, exactement comme `src/server/actions/tags.ts`. Une création à une position occupée décale les suivants, une modification qui change de position déplace et referme l'ancienne, une suppression renumérote ce qui reste. Contrairement aux tags, il n'y a pas de `findCategoryIds` : une seule liste, tous les projets, triée par `displayOrder`.
- **`reorderProjects(orderedIds)` est l'équivalent de `reorderTags`, sans paramètre de catégorie.** Même garde d'ordre périmé via `sameIdSet` avant d'écrire.
- Le type d'état de formulaire réutilise **`FormActionState<TInput, TMessage>`** de `src/lib/form-state.ts`, comme `src/server/actions/tags.types.ts` : pas de type dupliqué à la main.
- Les erreurs de validation se lisent par **`z.flattenError(result.error).fieldErrors`**, jamais `result.error.flatten()` (dépréciée, cf. `.claude/rules/zod/validation.md`).
- **Chaque Server Action ouvre par `await getCurrentUser()`**, hors de tout `try/catch`. Une action exportée est un endpoint HTTP invocable par quiconque connaît son identifiant : le layout protège l'affichage des pages, pas l'exécution des actions. `.claude/rules/nextjs/server-actions.md` l'impose deux fois, en « à faire » (défense en profondeur) et en « à éviter » (dépendre uniquement du proxy). L'appel doit précéder le `try`, sans quoi le `catch` avalerait l'interruption `unauthorized()` et transformerait un refus d'accès en `unknown_error`.
- `updateTag('projects')` après chaque mutation réussie, `createProject`/`updateProject`/`deleteProject` et `reorderProjects` compris. `updateTag` fait attendre la requête suivante le temps de recharger, quand `revalidateTag(tag, 'max')` servirait d'abord du contenu périmé : c'est ce que le sub-project `13` vérifie en passant un projet en publié puis en consultant `/fr/projets`.
- **`revalidatePath('/admin/projets')` en plus**, dans les mêmes mutations. L'étiquette `projects` n'est portée que par les requêtes publiques : les écrans d'administration lisent sans cache et sans étiquette, rien ne les rafraîchirait. Sans cet appel, une ligne supprimée ou réordonnée reste affichée, et les scénarios correspondants du sub-project `12` échouent.
- Renommer l'import de cache si le fichier exporte une action homonyme : `import { updateTag as updateCacheTag } from 'next/cache'`.
- La requête d'administration ignore le statut et n'utilise pas `'use cache'`.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Modèles concernés** (vérifiés, cibles après migration) :

```prisma
model Project {
  id                  String          @id @default(uuid(7))
  slug                String          @unique
  titleFr             String
  titleEn             String
  descriptionFr       String
  descriptionEn       String
  type                ProjectType
  status              ProjectStatus   @default(DRAFT)
  formats             ProjectFormat[]
  startedAt           DateTime?       @db.Timestamptz
  endedAt             DateTime?       @db.Timestamptz
  githubUrl           String?
  demoUrl             String?
  coverFilename       String?
  caseStudyMarkdownFr String?
  caseStudyMarkdownEn String?
  displayOrder        Int             @default(1)
  tags                ProjectTag[]
  clientMeta          ClientMeta?
}

model ClientMeta {
  projectId         String          @unique
  project           Project         @relation(..., onDelete: Cascade)
  companyId         String
  company           Company         @relation(..., onDelete: Restrict)
  teamSize          Int?
  contractStatus    ContractStatus?
  workMode          WorkMode                      // requis
  deliverablesCount Int             @default(1)
}

model ProjectTag {
  projectId    String
  tagId        String
  displayOrder Int     @default(1)
  @@id([projectId, tagId])
}
```

Enums : `ProjectType { CLIENT PERSONAL }`, `ProjectStatus { DRAFT PUBLISHED ARCHIVED }`, `ProjectFormat { API WEB_APP MOBILE_APP DESKTOP_APP CLI IA }`, `ContractStatus { FREELANCE CDI STAGE ALTERNANCE }`, `WorkMode { PRESENTIEL HYBRIDE REMOTE }`.

**Rules :** `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/zod/validation.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/prisma/schema-migrations.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/vitest/setup.md`.

---

### Task 1 : Schéma à validation conditionnelle

**Files:**
- Create: `src/lib/schemas/project.ts`
- Create: `src/server/actions/projects.types.ts`

**Interfaces:**
- Consomme : `FormActionState` (`src/lib/form-state.ts`).
- Produit : `projectSchema`, `projectReorderSchema`, `ProjectInput`, `ProjectFormState`, `initialProjectFormState`, `ProjectReorderState`, consommés par la Task 3.

- [ ] **Step 1: Écrire le schéma**

```typescript
import { z } from 'zod'

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const PROJECT_TYPES = ['CLIENT', 'PERSONAL'] as const
export const PROJECT_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const
export const PROJECT_FORMATS = ['API', 'WEB_APP', 'MOBILE_APP', 'DESKTOP_APP', 'CLI', 'IA'] as const
export const CONTRACT_STATUSES = ['FREELANCE', 'CDI', 'STAGE', 'ALTERNANCE'] as const
export const WORK_MODES = ['PRESENTIEL', 'HYBRIDE', 'REMOTE'] as const

const emptyToNull = (value: unknown) => (value === '' ? null : value)

export const projectSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .min(1, 'Le slug est requis')
      .max(80, 'Le slug ne peut pas dépasser 80 caractères')
      .regex(SLUG_PATTERN, 'Le slug ne peut contenir que des minuscules, des chiffres et des tirets'),
    titleFr: z.string().trim().min(1, 'Le titre français est requis').max(120, 'Titre français trop long'),
    titleEn: z.string().trim().min(1, "Le titre anglais est requis").max(120, 'Titre anglais trop long'),
    descriptionFr: z.string().trim().min(1, 'La description française est requise'),
    descriptionEn: z.string().trim().min(1, "La description anglaise est requise"),
    type: z.enum(PROJECT_TYPES, { error: 'Le type est requis' }),
    status: z.enum(PROJECT_STATUSES, { error: 'Le statut est requis' }),
    formats: z.array(z.enum(PROJECT_FORMATS, { error: 'Format inconnu' })).min(1, 'Sélectionne au moins un format'),
    startedAt: z.preprocess(emptyToNull, z.coerce.date().nullable()),
    endedAt: z.preprocess(emptyToNull, z.coerce.date().nullable()),
    githubUrl: z.preprocess(
      emptyToNull,
      z.url({ protocol: /^https?$/, error: "L'URL GitHub n'est pas valide" }).nullable(),
    ),
    demoUrl: z.preprocess(
      emptyToNull,
      z.url({ protocol: /^https?$/, error: "L'URL de démonstration n'est pas valide" }).nullable(),
    ),
    coverFilename: z.preprocess(emptyToNull, z.string().nullable()),
    caseStudyMarkdownFr: z.preprocess(emptyToNull, z.string().nullable()),
    caseStudyMarkdownEn: z.preprocess(emptyToNull, z.string().nullable()),
    // Le contrôle de chaîne précède la coercition : Number('') vaut 0, un champ vidé passerait
    // sinon pour un ordre valide (même piège que displayOrder sur les tags).
    displayOrder: z
      .string()
      .trim()
      .min(1, "L'ordre est requis")
      .pipe(
        z.coerce
          .number<string>({ error: "L'ordre doit être un nombre" })
          .int("L'ordre doit être un entier")
          .min(1, "L'ordre commence à 1"),
      ),
    tagIds: z.array(z.string()).default([]),

    companyId: z.preprocess(emptyToNull, z.string().nullable()),
    workMode: z.preprocess(emptyToNull, z.enum(WORK_MODES).nullable()),
    contractStatus: z.preprocess(emptyToNull, z.enum(CONTRACT_STATUSES).nullable()),
    teamSize: z.preprocess(emptyToNull, z.coerce.number().int().min(1).nullable()),
    deliverablesCount: z.coerce.number().int().min(1).default(1),
  })
  .superRefine((data, ctx) => {
    if (data.type === 'CLIENT') {
      if (!data.companyId) {
        ctx.addIssue({ code: 'custom', path: ['companyId'], message: "L'entreprise est requise pour un projet client" })
      }
      if (!data.workMode) {
        ctx.addIssue({ code: 'custom', path: ['workMode'], message: 'Le mode de travail est requis pour un projet client' })
      }
    }

    if (data.startedAt && data.endedAt && data.endedAt < data.startedAt) {
      ctx.addIssue({
        code: 'custom',
        path: ['endedAt'],
        message: 'La date de fin ne peut pas précéder la date de début',
      })
    }
  })

export type ProjectInput = z.infer<typeof projectSchema>

export const projectReorderSchema = z.object({
  orderedIds: z
    .array(z.string().min(1, 'Identifiant de projet invalide'))
    .min(1, 'La liste des projets est requise')
    .refine((ids) => new Set(ids).size === ids.length, {
      error: 'La liste des projets ne peut pas contenir de doublon',
    }),
})
```

Le `superRefine` porte les deux règles que la base ne peut pas exprimer. `workMode` y figure au même titre que `companyId` parce qu'il est **requis** dans `ClientMeta`, contrairement à `teamSize` et `contractStatus` : l'omettre produirait une erreur de base au lieu d'un message de formulaire.

`emptyToNull` en `preprocess` traite le fait qu'un `FormData` renvoie `''` et jamais `undefined`. Sans lui, `z.url()` échouerait sur un champ facultatif laissé vide.

**Le `protocol` sur les deux URL n'est pas optionnel.** `z.url()` nu valide par `new URL()`, qui accepte `javascript:alert(1)` : `demoUrl` et `githubUrl` finissent tous deux dans un `href` de page publique, c'est donc un XSS stocké. `docs/PRODUCTION.md` § Checklist Pré-MEP nomme ces deux champs avec `Company.websiteUrl` et demande de les corriger « avant le premier formulaire d'édition de l'espace admin ». Le sub-project `08` a traité le troisième, celui-ci ferme les deux derniers.

`src/lib/url.ts` porte bien un `safeExternalUrl`, mais il filtre au rendu du seul case study : il ne couvre ni l'écriture, ni les cartes projet, ni la table admin.

`deliverablesCount` mérite un `defaultValue={1}` côté formulaire au sub-project `13` : un champ numérique vidé produit `Number('')`, soit `0`, que le `min(1)` refuse avec un message qui n'oriente pas vers la cause.

`projectReorderSchema` n'a pas de champ `kind`, contrairement à `tagReorderSchema` : l'ordre des projets n'est pas scopé par catégorie (cf. Global Constraints), donc pas de discriminant à valider.

- [ ] **Step 2: Écrire les types d'état**

```typescript
import type { FormActionState } from '@/lib/form-state'
import type { ProjectInput } from '@/lib/schemas/project'

export type ProjectFormMessage = 'slug_taken' | 'unknown_error' | null

export type ProjectFormState = FormActionState<ProjectInput, ProjectFormMessage> & {
  savedId?: string
}

export const initialProjectFormState: ProjectFormState = {
  ok: null,
  errors: {},
  message: null,
}

export type ProjectReorderState =
  | { ok: true; message: null }
  | { ok: false; message: 'invalid_order' | 'stale_order' | 'unknown_error' }
```

`savedId` s'ajoute par intersection plutôt que par un champ de `FormActionState` : seuls la création et la modification de projet le portent, ni le contact ni les tags n'en ont besoin.

---

### Task 2 : Migration Prisma, ordre à partir de 1

**Files:**
- Modify: `prisma/schema.prisma`
- Create: une migration générée par la CLI Prisma (dossier `prisma/migrations/<timestamp>_project_display_order_from_one/`)

**Interfaces:**
- Consomme : rien.
- Produit : `Project.displayOrder` et `ProjectTag.displayOrder` en `@default(1)`, données existantes décalées d'un cran, consommés par la Task 3.

- [ ] **Step 1: Modifier le schéma**

Dans `model Project`, remplacer `displayOrder Int @default(0)` par `displayOrder Int @default(1)`. Dans `model ProjectTag`, remplacer `displayOrder Int @default(0)` par `displayOrder Int @default(1)`.

- [ ] **Step 2: Générer la migration**

```bash
pnpm prisma migrate dev --name project_display_order_from_one --create-only
```

`--create-only` : la migration générée n'ajuste que le `DEFAULT`, elle doit encore décaler les lignes existantes avant d'être appliquée.

- [ ] **Step 3: Compléter le SQL généré**

Ajouter le décalage des données, sur le modèle de `prisma/migrations/20260917151326_tag_display_order_from_one/migration.sql` :

```sql
-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "displayOrder" SET DEFAULT 1;
ALTER TABLE "ProjectTag" ALTER COLUMN "displayOrder" SET DEFAULT 1;

-- Décale les données existantes : la règle métier "1..n sans trou" démarre à 1, pas à 0.
UPDATE "public"."Project" SET "displayOrder" = "displayOrder" + 1;
UPDATE "public"."ProjectTag" SET "displayOrder" = "displayOrder" + 1;
```

- [ ] **Step 4: Appliquer et régénérer le client**

```bash
pnpm prisma migrate dev
pnpm prisma generate
```

- [ ] **Step 5: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur.

---

### Task 3 : Server Actions, en TDD

**Files:**
- Test: `src/server/actions/projects.test.ts`
- Create: `src/server/actions/projects.ts`

**Interfaces:**
- Consomme : `projectSchema`, `projectReorderSchema` (Task 1), `computeIdsAtPosition`, `removeId`, `sameIdSet` (`src/lib/reorder.ts`), `prisma`, `createActionLogger`.
- Produit : `createProject`, `updateProject`, `deleteProject`, `reorderProjects`, consommées par les sub-projects `12` et `13`.

- [ ] **Step 1: Écrire les tests qui échouent**

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock('next/cache', () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))
vi.mock('@/lib/prisma', () => {
  const project = { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findMany: vi.fn() }
  const clientMeta = { create: vi.fn(), upsert: vi.fn(), deleteMany: vi.fn() }
  const projectTag = { deleteMany: vi.fn(), createMany: vi.fn() }
  const prisma = { project, clientMeta, projectTag, $transaction: vi.fn() }
  // Sert les deux formes de $transaction (tableau de promesses ou callback interactif) sans
  // configuration par test, comme src/server/actions/tags.test.ts.
  prisma.$transaction.mockImplementation((arg: unknown) =>
    typeof arg === 'function'
      ? (arg as (tx: typeof prisma) => Promise<unknown>)(prisma)
      : Promise.all(arg as Promise<unknown>[]),
  )
  return { prisma }
})
vi.mock('@/lib/get-current-user', () => ({ getCurrentUser: vi.fn() }))

import { revalidatePath, updateTag as updateCacheTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-current-user'
import { createProject, deleteProject, reorderProjects, updateProject } from './projects'
import { initialProjectFormState } from './projects.types'

function objectMatch(value: Record<string, unknown>): Record<string, unknown> {
  const matcher: unknown = expect.objectContaining(value)
  return matcher as Record<string, unknown>
}

function buildFormData(
  overrides: Record<string, string> = {},
  options: { formats?: string[]; tagIds?: string[] } = {},
): FormData {
  const data = new FormData()
  const base = {
    slug: 'mon-projet',
    titleFr: 'Mon projet',
    titleEn: 'My project',
    descriptionFr: 'Description française',
    descriptionEn: 'English description',
    type: 'PERSONAL',
    status: 'DRAFT',
    startedAt: '',
    endedAt: '',
    githubUrl: '',
    demoUrl: '',
    coverFilename: '',
    caseStudyMarkdownFr: '',
    caseStudyMarkdownEn: '',
    displayOrder: '1',
    companyId: '',
    workMode: '',
    contractStatus: '',
    teamSize: '',
    deliverablesCount: '1',
  }
  for (const [key, value] of Object.entries({ ...base, ...overrides })) {
    data.set(key, value)
  }
  for (const format of options.formats ?? ['WEB_APP']) data.append('formats', format)
  for (const tagId of options.tagIds ?? []) data.append('tagIds', tagId)
  return data
}

describe('createProject', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('refuse un slug vide sans ouvrir de transaction', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ slug: '' }))

    expect(state.errors.slug).toBeDefined()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('refuse un titre français vide', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ titleFr: '' }))

    expect(state.errors.titleFr).toBeDefined()
  })

  it('refuse un titre anglais vide', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ titleEn: '' }))

    expect(state.errors.titleEn).toBeDefined()
  })

  it('refuse un type inconnu', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ type: 'AUTRE' }))

    expect(state.errors.type).toBeDefined()
  })

  it('refuse un statut inconnu', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ status: 'AUTRE' }))

    expect(state.errors.status).toBeDefined()
  })

  it('refuse un format inconnu', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({}, { formats: ['INCONNU'] }))

    expect(state.errors.formats).toBeDefined()
  })

  it('conserve tous les formats soumis', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'p1' } as never)

    await createProject(initialProjectFormState, buildFormData({}, { formats: ['API', 'IA'] }))

    expect(prisma.project.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ formats: ['API', 'IA'] }) }),
    )
  })

  it('refuse un projet client sans entreprise', async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ type: 'CLIENT', workMode: 'REMOTE' }),
    )

    expect(state.errors.companyId).toBeDefined()
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('refuse un projet client sans mode de travail', async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ type: 'CLIENT', companyId: 'c1' }),
    )

    expect(state.errors.workMode).toBeDefined()
  })

  it('crée la méta client pour un projet client', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'p1' } as never)

    await createProject(
      initialProjectFormState,
      buildFormData({ type: 'CLIENT', companyId: 'c1', workMode: 'HYBRIDE' }),
    )

    expect(prisma.clientMeta.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ projectId: 'p1', companyId: 'c1', workMode: 'HYBRIDE' }) }),
    )
  })

  it("ne crée aucune méta client pour un projet personnel, même si une entreprise est soumise", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'p1' } as never)

    await createProject(initialProjectFormState, buildFormData({ type: 'PERSONAL', companyId: 'c1' }))

    expect(prisma.clientMeta.create).not.toHaveBeenCalled()
  })

  it('refuse une date de fin antérieure à la date de début', async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ startedAt: '2026-06-01', endedAt: '2026-01-01' }),
    )

    expect(state.errors.endedAt).toBeDefined()
  })

  it('accepte des dates absentes', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'p1' } as never)

    const state = await createProject(initialProjectFormState, buildFormData({ startedAt: '', endedAt: '' }))

    expect(state.ok).toBe(true)
  })

  it('refuse une URL GitHub en javascript:', async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ githubUrl: 'javascript:alert(1)' }),
    )

    expect(state.ok).toBe(false)
    expect(state.errors.githubUrl).toBeDefined()
    expect(prisma.project.create).not.toHaveBeenCalled()
  })

  it('refuse une URL mal formée', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ githubUrl: 'pas-une-url' }))

    expect(state.errors.githubUrl).toBeDefined()
  })

  it('enregistre une URL vide en null', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'p1' } as never)

    await createProject(initialProjectFormState, buildFormData({ githubUrl: '' }))

    expect(prisma.project.create).toHaveBeenCalledWith(
      objectMatch({ data: objectMatch({ githubUrl: null }) }),
    )
  })

  it("rattache les tags dans l'ordre soumis, en base 1", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'p1' } as never)

    await createProject(initialProjectFormState, buildFormData({}, { tagIds: ['t2', 't1'] }))

    expect(prisma.projectTag.createMany).toHaveBeenCalledWith(
      objectMatch({
        data: [
          { projectId: 'p1', tagId: 't2', displayOrder: 1 },
          { projectId: 'p1', tagId: 't1', displayOrder: 2 },
        ],
      }),
    )
  })

  it('crée un projet à une position occupée et décale les suivants, dans une transaction', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { id: 'p-a' },
      { id: 'p-b' },
      { id: 'p-c' },
    ] as never)
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'p-new' } as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    await createProject(initialProjectFormState, buildFormData({ displayOrder: '2' }))

    expect(prisma.project.create).toHaveBeenCalledTimes(1)
    expect(prisma.project.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'p-a' },
      data: { displayOrder: 1 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'p-new' },
      data: { displayOrder: 2 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'p-b' },
      data: { displayOrder: 3 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(4, {
      where: { id: 'p-c' },
      data: { displayOrder: 4 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('ouvre une transaction', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'p1' } as never)

    await createProject(initialProjectFormState, buildFormData())

    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it("invalide l'étiquette projects", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockResolvedValue({ id: 'p1' } as never)

    await createProject(initialProjectFormState, buildFormData())

    expect(updateCacheTag).toHaveBeenCalledWith('projects')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/projets')
  })

  it("traduit une violation d'unicité de slug en erreur de champ", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([])
    vi.mocked(prisma.project.create).mockRejectedValue({ code: 'P2002', meta: { target: ['slug'] } })

    const state = await createProject(initialProjectFormState, buildFormData())

    expect(state.message).toBe('slug_taken')
    expect(state.errors.slug).toBeDefined()
  })

  it("retourne les valeurs saisies dans l'état en cas d'échec de validation", async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ slug: '' }))

    expect(state.values?.slug).toBe('')
  })

  it("refuse un appel sans session, avant d'ouvrir la transaction", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    await expect(createProject(initialProjectFormState, buildFormData())).rejects.toThrow()

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})

describe('updateProject', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('supprime la méta client au passage en personnel', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: 'p1' }] as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    await updateProject('p1', initialProjectFormState, buildFormData({ type: 'PERSONAL' }))

    expect(prisma.clientMeta.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'p1' } })
  })

  it('crée ou met à jour la méta client au passage en client', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: 'p1' }] as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    await updateProject(
      'p1',
      initialProjectFormState,
      buildFormData({ type: 'CLIENT', companyId: 'c1', workMode: 'REMOTE' }),
    )

    expect(prisma.clientMeta.upsert).toHaveBeenCalled()
  })

  it('remplace intégralement le jeu de tags, en base 1', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: 'p1' }] as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    await updateProject('p1', initialProjectFormState, buildFormData({}, { tagIds: ['t3'] }))

    expect(prisma.projectTag.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'p1' } })
    expect(prisma.projectTag.createMany).toHaveBeenCalledWith(
      objectMatch({ data: [{ projectId: 'p1', tagId: 't3', displayOrder: 1 }] }),
    )
  })

  it('déplace un projet et referme sa position, dans une transaction', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      { id: 'p-a' },
      { id: 'p-b' },
      { id: 'p-c' },
    ] as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    await updateProject('p-c', initialProjectFormState, buildFormData({ displayOrder: '1' }))

    expect(prisma.project.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'p-c' },
      data: objectMatch({ displayOrder: 1 }),
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'p-a' },
      data: { displayOrder: 2 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(3, {
      where: { id: 'p-b' },
      data: { displayOrder: 3 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })
})

describe('deleteProject', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('renumérote la suite restante dans la même transaction', async () => {
    vi.mocked(prisma.project.delete).mockResolvedValue({} as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: 'p-a' }, { id: 'p-c' }] as never)
    vi.mocked(prisma.project.update).mockResolvedValue({} as never)

    await deleteProject('p-b')

    expect(prisma.project.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'p-a' },
      data: { displayOrder: 1 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'p-c' },
      data: { displayOrder: 2 },
    })
    expect(prisma.$transaction).toHaveBeenCalledTimes(1)
  })

  it('invalide les caches après suppression', async () => {
    vi.mocked(prisma.project.delete).mockResolvedValue({} as never)
    vi.mocked(prisma.project.findMany).mockResolvedValue([])

    await deleteProject('p1')

    expect(updateCacheTag).toHaveBeenCalledWith('projects')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/projets')
  })

  it('refuse un appel sans session, avant toute requête base', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    await expect(deleteProject('p1')).rejects.toThrow()

    expect(prisma.project.delete).not.toHaveBeenCalled()
  })
})

describe('reorderProjects', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('refuse un appel sans session, avant toute requête base', async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    await expect(reorderProjects(['p1'])).rejects.toThrow()

    expect(prisma.project.findMany).not.toHaveBeenCalled()
  })

  it('refuse une liste en doublon sans rien écrire', async () => {
    const state = await reorderProjects(['p1', 'p1'])

    expect(state).toEqual({ ok: false, message: 'invalid_order' })
    expect(prisma.project.findMany).not.toHaveBeenCalled()
  })

  it("refuse une liste qui ne couvre pas exactement l'ensemble des projets", async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: 'p1' }, { id: 'p2' }] as never)

    const state = await reorderProjects(['p1', 'p3'])

    expect(state).toEqual({ ok: false, message: 'stale_order' })
    expect(prisma.$transaction).not.toHaveBeenCalled()
  })

  it('réécrit displayOrder à partir de 1 dans l\'ordre reçu, dans une transaction, puis invalide les caches', async () => {
    vi.mocked(prisma.project.findMany).mockResolvedValue([{ id: 'p1' }, { id: 'p2' }] as never)
    vi.mocked(prisma.$transaction).mockResolvedValue([] as never)

    const state = await reorderProjects(['p2', 'p1'])

    expect(state).toEqual({ ok: true, message: null })
    expect(prisma.project.update).toHaveBeenNthCalledWith(1, {
      where: { id: 'p2' },
      data: { displayOrder: 1 },
    })
    expect(prisma.project.update).toHaveBeenNthCalledWith(2, {
      where: { id: 'p1' },
      data: { displayOrder: 2 },
    })
    expect(updateCacheTag).toHaveBeenCalledWith('projects')
    expect(revalidatePath).toHaveBeenCalledWith('/admin/projets')
  })
})
```

Le mock de `$transaction` exécute la fonction reçue avec `prisma` lui-même comme client factice, ce qui permet de vérifier **quelles opérations ont eu lieu dedans** plutôt que de se contenter de constater qu'une transaction a été ouverte. C'est la forme employée par `src/server/actions/tags.test.ts`, reprise ici à l'identique.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run --project unit src/server/actions/projects.test.ts`
Expected: FAIL, le module `./projects` n'existe pas.

- [ ] **Step 3: Écrire les Server Actions**

```typescript
'use server'

import 'server-only'
import { revalidatePath, updateTag as updateCacheTag } from 'next/cache'

import { getCurrentUser } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'
import { computeIdsAtPosition, removeId, sameIdSet } from '@/lib/reorder'
import { projectReorderSchema, projectSchema, type ProjectInput } from '@/lib/schemas/project'
import { createActionLogger } from '@/lib/server-utils'
import type { Prisma } from '@/generated/prisma/client'
import { z } from 'zod'

import { type ProjectFormState, type ProjectReorderState } from './projects.types'

function hasCode(err: unknown, code: string): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === code
}

function parseFormData(formData: FormData) {
  return projectSchema.safeParse({
    slug: formData.get('slug') ?? '',
    titleFr: formData.get('titleFr') ?? '',
    titleEn: formData.get('titleEn') ?? '',
    descriptionFr: formData.get('descriptionFr') ?? '',
    descriptionEn: formData.get('descriptionEn') ?? '',
    type: formData.get('type') ?? '',
    status: formData.get('status') ?? '',
    formats: formData.getAll('formats'),
    startedAt: formData.get('startedAt') ?? '',
    endedAt: formData.get('endedAt') ?? '',
    githubUrl: formData.get('githubUrl') ?? '',
    demoUrl: formData.get('demoUrl') ?? '',
    coverFilename: formData.get('coverFilename') ?? '',
    caseStudyMarkdownFr: formData.get('caseStudyMarkdownFr') ?? '',
    caseStudyMarkdownEn: formData.get('caseStudyMarkdownEn') ?? '',
    displayOrder: formData.get('displayOrder') ?? '',
    tagIds: formData.getAll('tagIds'),
    companyId: formData.get('companyId') ?? '',
    workMode: formData.get('workMode') ?? '',
    contractStatus: formData.get('contractStatus') ?? '',
    teamSize: formData.get('teamSize') ?? '',
    deliverablesCount: formData.get('deliverablesCount') ?? '1',
  })
}

function collectValues(formData: FormData): ProjectFormState['values'] {
  const values: Record<string, string> = {}
  for (const key of new Set(formData.keys())) {
    values[key] = String(formData.get(key) ?? '')
  }
  return values as ProjectFormState['values']
}

// Champs du projet lui-même, séparés de ceux qui alimentent ClientMeta : Prisma refuserait
// companyId ou workMode sur project.create/update.
function projectData(input: ProjectInput) {
  const { tagIds, companyId, workMode, contractStatus, teamSize, deliverablesCount, ...project } = input
  return project
}

async function findAllProjectIds(): Promise<string[]> {
  const projects = await prisma.project.findMany({
    orderBy: { displayOrder: 'asc' },
    select: { id: true },
  })
  return projects.map((project) => project.id)
}

// Symétrique de renumberTags (src/server/actions/tags.ts), sans findCategoryIds : une seule
// liste, tous les projets, aucun axe qui la partitionnerait (cf. spec § Décision : portée de
// l'ordre d'affichage des projets).
function renumberProjects(
  projectClient: Prisma.TransactionClient['project'],
  orderedIds: readonly string[],
  edited?: { id: string; data: ReturnType<typeof projectData> },
) {
  return orderedIds.map((id, index) =>
    projectClient.update({
      where: { id },
      data: id === edited?.id ? { ...edited.data, displayOrder: index + 1 } : { displayOrder: index + 1 },
    }),
  )
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('createProject')
  const values = collectValues(formData)

  const result = parseFormData(formData)
  if (!result.success) {
    return { ok: false, errors: z.flattenError(result.error).fieldErrors, message: null, values }
  }

  const input = result.data
  const existingIds = await findAllProjectIds()

  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({ data: projectData(input) })

      await Promise.all(
        renumberProjects(tx.project, computeIdsAtPosition(existingIds, created.id, input.displayOrder)),
      )

      if (input.type === 'CLIENT' && input.companyId && input.workMode) {
        await tx.clientMeta.create({
          data: {
            projectId: created.id,
            companyId: input.companyId,
            workMode: input.workMode,
            contractStatus: input.contractStatus,
            teamSize: input.teamSize,
            deliverablesCount: input.deliverablesCount,
          },
        })
      }

      if (input.tagIds.length > 0) {
        await tx.projectTag.createMany({
          data: input.tagIds.map((tagId, index) => ({
            projectId: created.id,
            tagId,
            displayOrder: index + 1,
          })),
        })
      }

      return created
    })

    updateCacheTag('projects')
    revalidatePath('/admin/projets')
    log.info({ event: 'project:created', slug: input.slug })
    return { ok: true, errors: {}, message: null, savedId: project.id }
  } catch (err) {
    if (hasCode(err, 'P2002')) {
      return {
        ok: false,
        errors: { slug: ['Ce slug est déjà utilisé par un autre projet'] },
        message: 'slug_taken',
        values,
      }
    }
    log.error({ err, event: 'project:create_failed' })
    return { ok: false, errors: {}, message: 'unknown_error', values }
  }
}

export async function updateProject(
  id: string,
  _prevState: ProjectFormState,
  formData: FormData,
): Promise<ProjectFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('updateProject')
  const values = collectValues(formData)

  const result = parseFormData(formData)
  if (!result.success) {
    return { ok: false, errors: z.flattenError(result.error).fieldErrors, message: null, values }
  }

  const input = result.data
  const existingIds = await findAllProjectIds()

  try {
    await prisma.$transaction(async (tx) => {
      await Promise.all(
        renumberProjects(tx.project, computeIdsAtPosition(existingIds, id, input.displayOrder), {
          id,
          data: projectData(input),
        }),
      )

      if (input.type === 'CLIENT' && input.companyId && input.workMode) {
        await tx.clientMeta.upsert({
          where: { projectId: id },
          create: {
            projectId: id,
            companyId: input.companyId,
            workMode: input.workMode,
            contractStatus: input.contractStatus,
            teamSize: input.teamSize,
            deliverablesCount: input.deliverablesCount,
          },
          update: {
            companyId: input.companyId,
            workMode: input.workMode,
            contractStatus: input.contractStatus,
            teamSize: input.teamSize,
            deliverablesCount: input.deliverablesCount,
          },
        })
      } else {
        // Bascule vers PERSONAL : la méta client est perdue, c'est assumé.
        await tx.clientMeta.deleteMany({ where: { projectId: id } })
      }

      await tx.projectTag.deleteMany({ where: { projectId: id } })
      if (input.tagIds.length > 0) {
        await tx.projectTag.createMany({
          data: input.tagIds.map((tagId, index) => ({
            projectId: id,
            tagId,
            displayOrder: index + 1,
          })),
        })
      }
    })

    updateCacheTag('projects')
    revalidatePath('/admin/projets')
    log.info({ event: 'project:updated', slug: input.slug })
    return { ok: true, errors: {}, message: null, savedId: id }
  } catch (err) {
    if (hasCode(err, 'P2002')) {
      return {
        ok: false,
        errors: { slug: ['Ce slug est déjà utilisé par un autre projet'] },
        message: 'slug_taken',
        values,
      }
    }
    log.error({ err, event: 'project:update_failed' })
    return { ok: false, errors: {}, message: 'unknown_error', values }
  }
}

export async function deleteProject(id: string): Promise<ProjectFormState> {
  await getCurrentUser()

  const { log } = await createActionLogger('deleteProject')

  try {
    await prisma.$transaction(async (tx) => {
      await tx.project.delete({ where: { id } })
      const remaining = await tx.project.findMany({
        orderBy: { displayOrder: 'asc' },
        select: { id: true },
      })
      await Promise.all(renumberProjects(tx.project, remaining.map((project) => project.id)))
    })

    updateCacheTag('projects')
    revalidatePath('/admin/projets')
    log.info({ event: 'project:deleted', id })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    log.error({ err, event: 'project:delete_failed' })
    return { ok: false, errors: {}, message: 'unknown_error' }
  }
}

export async function reorderProjects(orderedIds: string[]): Promise<ProjectReorderState> {
  await getCurrentUser()

  const { log } = await createActionLogger('reorderProjects')

  const result = projectReorderSchema.safeParse({ orderedIds })
  if (!result.success) {
    return { ok: false, message: 'invalid_order' }
  }

  try {
    const existing = await prisma.project.findMany({ select: { id: true } })

    // Une création ou une suppression survenue entre l'affichage de la liste et le dépôt du
    // glisser-déposer rend l'ordre reçu périmé : réécrire un sous-ensemble laisserait des
    // displayOrder en doublon ou troués.
    const existingIds = existing.map((project) => project.id)
    if (!sameIdSet(existingIds, result.data.orderedIds)) {
      return { ok: false, message: 'stale_order' }
    }

    await prisma.$transaction(renumberProjects(prisma.project, result.data.orderedIds))

    updateCacheTag('projects')
    revalidatePath('/admin/projets')
    log.info({ event: 'project:reordered', count: result.data.orderedIds.length })
    return { ok: true, message: null }
  } catch (err) {
    log.error({ err, event: 'project:reorder_failed' })
    return { ok: false, message: 'unknown_error' }
  }
}
```

`projectData` sépare par déstructuration les champs du projet de ceux qui alimentent la méta client : sans cette séparation, Prisma refuserait `companyId` sur `project.create`.

`renumberProjects` reprend `renumberTags` presque à l'identique, `removeId` en moins dans ce fichier (pas de changement de catégorie à gérer, contrairement au tag qui change de `kind`) : la seule branche est « la position a changé » ou non, jamais « l'axe de tri a changé ».

`await getCurrentUser()` ouvre les quatre actions, hors du `try`. Le `catch` avalerait sinon l'interruption `unauthorized()` et la convertirait en `unknown_error`.

`deleteProject` a besoin d'une transaction : `ClientMeta` et `ProjectTag` restent nettoyés par leur `onDelete: Cascade`, mais renuméroter les projets restants doit se faire dans la même transaction que la suppression, sans quoi une lecture concurrente verrait un trou le temps des deux appels.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run --project unit src/server/actions/projects.test.ts`
Expected: PASS.

- [ ] **Step 5: Vérifier typage et lint**

```bash
just typecheck && just lint
```

Expected: aucune erreur.

---

### Task 4 : Requête d'administration

**Files:**
- Modify: `src/server/queries/projects.ts`

**Interfaces:**
- Consomme : `prisma`.
- Produit : `findAllProjectsForAdmin()` et `findProjectForAdmin(id)`, consommées par les sub-projects `12` et `13`.

- [ ] **Step 1: Ajouter les requêtes**

```typescript
export async function findAllProjectsForAdmin() {
  return prisma.project.findMany({
    include: {
      clientMeta: { include: { company: { select: { id: true, name: true, logoFilename: true } } } },
      tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } },
    },
    orderBy: { displayOrder: 'asc' },
  })
}

export async function findProjectForAdmin(id: string) {
  return prisma.project.findUnique({
    where: { id },
    include: {
      clientMeta: true,
      tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } },
    },
  })
}
```

Ni `'use cache'` ni filtre sur le statut, contrairement à `findManyPublished`. L'administration doit voir les brouillons et les archivés, et les voir immédiatement après une mutation.

Le tri est un simple `orderBy: { displayOrder: 'asc' }`, sans tri secondaire sur le slug : `Project.displayOrder` forme une suite continue 1..n sans doublon possible depuis l'admin.

**Exporter le type de retour de chacune, ne jamais réutiliser `ProjectWithRelations`.** Ce dernier dérive de `PROJECT_INCLUDE` (`src/types/project.ts`), qui omet `logoFilename` de la `Company` parce que la vitrine ne le sert jamais ; la requête d'administration en a besoin pour la colonne Entreprise du sub-project `12` (mini logo). Les types ne sont pas assignables et `just typecheck` le refusera. Déclarer, à côté des requêtes :

```typescript
export type AdminProjectListItem = Awaited<ReturnType<typeof findAllProjectsForAdmin>>[number]
export type AdminProjectDetail = NonNullable<Awaited<ReturnType<typeof findProjectForAdmin>>>
```

Ce sont ces deux types que consomment les écrans des sub-projects `12` et `13`. Ils suivent automatiquement toute évolution de l'`include`.

Pas de localisation : l'écran affiche les champs français et anglais côte à côte, puisqu'il sert à les éditer.

- [ ] **Step 2: Vérifier le typage**

```bash
just typecheck
```

Expected: aucune erreur.

---

### Task 5 : Vérifier sur données réelles

**Files:** aucun fichier du dépôt.

> Les tests couvrent la logique avec Prisma mocké. Cette tâche vérifie que les écritures réelles passent, ce qu'un mock ne peut pas prouver.

- [ ] **Step 1: Préparer une base de test à jour**

```bash
just db-test-reset
```

- [ ] **Step 2: Créer un projet client depuis un script temporaire**

Écrire un script jetable appelant `createProject` avec un `FormData` de type `CLIENT`, une entreprise du seed, un mode de travail et deux tags.

```sql
SELECT p.slug, p."displayOrder", cm."companyId", cm."workMode", count(pt."tagId") AS tags
FROM "Project" p
LEFT JOIN "ClientMeta" cm ON cm."projectId" = p.id
LEFT JOIN "ProjectTag" pt ON pt."projectId" = p.id
WHERE p.slug = '<slug>'
GROUP BY p.slug, p."displayOrder", cm."companyId", cm."workMode";
```

Expected: une ligne, avec la méta client renseignée, deux tags, et `displayOrder` égal à n+1 (n étant le nombre de projets du seed).

- [ ] **Step 3: Vérifier la création à une position occupée**

Créer un second projet avec `displayOrder = 1`.

```sql
SELECT slug, "displayOrder" FROM "Project" ORDER BY "displayOrder" ASC;
```

Expected: le nouveau projet est en position 1, tous les autres décalés d'un cran, sans trou ni doublon.

- [ ] **Step 4: Vérifier la bascule vers personnel**

Modifier le premier projet créé en `PERSONAL`.

```sql
SELECT count(*) FROM "ClientMeta" cm
JOIN "Project" p ON p.id = cm."projectId"
WHERE p.slug = '<slug>';
```

Expected: zéro. La méta client a bien été supprimée.

- [ ] **Step 5: Vérifier le remplacement des tags**

Modifier le projet avec un seul tag différent.

```sql
SELECT pt."tagId", pt."displayOrder" FROM "ProjectTag" pt
JOIN "Project" p ON p.id = pt."projectId"
WHERE p.slug = '<slug>';
```

Expected: une seule ligne, portant le nouveau tag et `displayOrder` à 1 (pas 0).

- [ ] **Step 6: Vérifier la suppression et la renumérotation**

Supprimer un projet du milieu de la suite.

```sql
SELECT slug, "displayOrder" FROM "Project" ORDER BY "displayOrder" ASC;
```

Expected: une suite continue de 1 à n-1, sans trou. Vérifier aussi que ses tags et son entreprise existent toujours, et que `ClientMeta`/`ProjectTag` n'ont plus de ligne pour ce projet.

- [ ] **Step 7: Vérifier `reorderProjects`**

Appeler `reorderProjects` avec la liste actuelle des ids dans un ordre permuté, puis avec une liste incomplète.

Expected: le premier appel réécrit `displayOrder` de 1 à n dans l'ordre donné ; le second échoue avec `stale_order` sans rien écrire.

- [ ] **Step 8: Supprimer le script temporaire**

- [ ] **Step 9: Lancer la suite complète**

```bash
just test
```

Expected: tous les tests verts.

- [ ] **Step 10: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): Server Actions des projets et ordre d'affichage 1..n
```
