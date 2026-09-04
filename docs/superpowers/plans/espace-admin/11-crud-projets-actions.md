# Server Actions des projets — Plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Créer, modifier et supprimer un projet avec sa méta client et ses tags, dans une transaction.

**Architecture:** Un schéma Zod à validation conditionnelle porte la règle que la base ne peut pas exprimer — un projet client exige une entreprise et un mode de travail, un projet personnel n'en a pas. Les écritures sur les trois tables passent par une transaction unique, et les tags sont remplacés intégralement plutôt que rapprochés.

**Tech Stack:** Next.js 16 Server Actions, Zod 4, Prisma 7, Vitest.

**Spec:** `docs/superpowers/specs/espace-admin/11-crud-projets-actions-design.md`

## Global Constraints

- **TDD strict** : les mutations de l'espace admin sont sous TDD complet dans la stratégie du projet.
- La cohérence entre `type` et `clientMeta` est portée par **Zod**, pas par la base : `clientMeta` y est simplement optionnel.
- Toute création ou modification passe par **`prisma.$transaction`** : trois tables sont écrites.
- Les tags sont **remplacés intégralement** à la modification, jamais rapprochés.
- `formats` se lit avec **`getAll`** : `get` ne conserverait que la première valeur.
- `workMode` est **requis** dans `ClientMeta`, contrairement à `teamSize` et `contractStatus`.
- Le passage de `CLIENT` à `PERSONAL` **supprime la méta client**. C'est assumé, et le formulaire du sub-project `13` devra avertir.
- **Chaque Server Action ouvre par `await getCurrentUser()`**, hors de tout `try/catch`. Une action exportée est un endpoint HTTP invocable par quiconque connaît son identifiant : le layout protège l'affichage des pages, pas l'exécution des actions. `.claude/rules/nextjs/server-actions.md` l'impose deux fois, en « à faire » (défense en profondeur) et en « à éviter » (dépendre uniquement du proxy). L'appel doit précéder le `try`, sans quoi le `catch` avalerait l'interruption `unauthorized()` et transformerait un refus d'accès en `unknown_error`.
- `updateTag('projects')` après chaque mutation réussie. `updateTag` fait attendre la requête suivante le temps de recharger, quand `revalidateTag(tag, 'max')` servirait d'abord du contenu périmé : c'est ce que le sub-project `13` vérifie en passant un projet en publié puis en consultant `/fr/projets`.
- **`revalidatePath('/admin/projets')` en plus**, dans les mêmes mutations. L'étiquette `projects` n'est portée que par les requêtes publiques : les écrans d'administration lisent sans cache et sans étiquette, rien ne les rafraîchirait. Sans cet appel, une ligne supprimée reste affichée, et le scénario correspondant du sub-project `12` échoue.
- Renommer l'import de cache si le fichier exporte une action homonyme : `import { updateTag as updateCacheTag } from 'next/cache'`.
- La requête d'administration ignore le statut et n'utilise pas `'use cache'`.
- Aucun commit intermédiaire. Le périmètre du commit final est validé par l'utilisateur.

**Modèles concernés** (vérifiés) :

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
  displayOrder        Int             @default(0)
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
  displayOrder Int     @default(0)
  @@id([projectId, tagId])
}
```

Enums : `ProjectType { CLIENT PERSONAL }`, `ProjectStatus { DRAFT PUBLISHED ARCHIVED }`, `ProjectFormat { API WEB_APP MOBILE_APP DESKTOP_APP CLI IA }`, `ContractStatus { FREELANCE CDI STAGE ALTERNANCE }`, `WorkMode { PRESENTIEL HYBRIDE REMOTE }`.

**Rules :** `.claude/rules/nextjs/server-actions.md`, `.claude/rules/zod/schemas.md`, `.claude/rules/prisma/client-setup.md`, `.claude/rules/nextjs/rendering-caching.md`, `.claude/rules/vitest/setup.md`.

---

### Task 1 : Schéma à validation conditionnelle

**Files:**
- Create: `src/lib/schemas/project.ts`
- Create: `src/server/actions/projects.types.ts`

**Interfaces:**
- Consomme : rien.
- Produit : `projectSchema`, `ProjectInput`, `ProjectFormState`, `initialProjectFormState`, consommés par la Task 2.

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
    githubUrl: z.preprocess(emptyToNull, z.url("L'URL GitHub n'est pas valide").nullable()),
    demoUrl: z.preprocess(emptyToNull, z.url("L'URL de démonstration n'est pas valide").nullable()),
    coverFilename: z.preprocess(emptyToNull, z.string().nullable()),
    caseStudyMarkdownFr: z.preprocess(emptyToNull, z.string().nullable()),
    caseStudyMarkdownEn: z.preprocess(emptyToNull, z.string().nullable()),
    displayOrder: z.coerce.number().int("L'ordre doit être un entier").min(0, "L'ordre ne peut pas être négatif"),
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
```

Le `superRefine` porte les deux règles que la base ne peut pas exprimer. `workMode` y figure au même titre que `companyId` parce qu'il est **requis** dans `ClientMeta`, contrairement à `teamSize` et `contractStatus` : l'omettre produirait une erreur de base au lieu d'un message de formulaire.

`emptyToNull` en `preprocess` traite le fait qu'un `FormData` renvoie `''` et jamais `undefined`. Sans lui, `z.url()` échouerait sur un champ facultatif laissé vide.

- [ ] **Step 2: Écrire les types d'état**

```typescript
import type { ProjectInput } from '@/lib/schemas/project'

export type ProjectFormMessage = 'slug_taken' | 'unknown_error' | null

export type ProjectFormState = {
  ok: boolean | null
  errors: Partial<Record<keyof ProjectInput, string[]>>
  message: ProjectFormMessage
  values?: Record<string, string | string[]>
  savedId?: string
}

export const initialProjectFormState: ProjectFormState = {
  ok: null,
  errors: {},
  message: null,
}
```

---

### Task 2 : Server Actions, en TDD

**Files:**
- Test: `src/server/actions/projects.test.ts`
- Create: `src/server/actions/projects.ts`

**Interfaces:**
- Consomme : `projectSchema` (Task 1), `prisma`, `createActionLogger`.
- Produit : `createProject`, `updateProject`, `deleteProject`, consommées par les sub-projects `12` et `13`.

- [ ] **Step 1: Écrire les tests qui échouent**

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('next/headers', () => ({ headers: vi.fn(() => new Headers()) }))
vi.mock('next/cache', () => ({ updateTag: vi.fn(), revalidatePath: vi.fn() }))
vi.mock('@/lib/logger', () => ({
  logger: { child: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })) },
}))

const tx = {
  project: { create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn() },
  clientMeta: { create: vi.fn(), update: vi.fn(), deleteMany: vi.fn(), upsert: vi.fn() },
  projectTag: { deleteMany: vi.fn(), createMany: vi.fn() },
}

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: vi.fn(async (fn: (client: typeof tx) => unknown) => fn(tx)),
  },
}))
vi.mock('@/lib/get-current-user', () => ({ getCurrentUser: vi.fn() }))


import { updateTag } from 'next/cache'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/get-current-user'
import { createProject, updateProject } from './projects'
import { initialProjectFormState } from './projects.types'

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
    displayOrder: '0',
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
  beforeEach(() => {
    vi.clearAllMocks()
    tx.project.create.mockResolvedValue({ id: 'p1' })
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

  it('refuse un format inconnu', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({}, { formats: ['INCONNU'] }))

    expect(state.errors.formats).toBeDefined()
  })

  it('conserve tous les formats soumis', async () => {
    await createProject(initialProjectFormState, buildFormData({}, { formats: ['API', 'IA'] }))

    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ formats: ['API', 'IA'] }) }),
    )
  })

  it("refuse un projet client sans entreprise", async () => {
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
    await createProject(
      initialProjectFormState,
      buildFormData({ type: 'CLIENT', companyId: 'c1', workMode: 'HYBRIDE' }),
    )

    expect(tx.clientMeta.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ companyId: 'c1', workMode: 'HYBRIDE', projectId: 'p1' }),
      }),
    )
  })

  it("ne crée aucune méta client pour un projet personnel, même si une entreprise est soumise", async () => {
    await createProject(initialProjectFormState, buildFormData({ type: 'PERSONAL', companyId: 'c1' }))

    expect(tx.clientMeta.create).not.toHaveBeenCalled()
  })

  it('refuse une date de fin antérieure à la date de début', async () => {
    const state = await createProject(
      initialProjectFormState,
      buildFormData({ startedAt: '2026-06-01', endedAt: '2026-01-01' }),
    )

    expect(state.errors.endedAt).toBeDefined()
  })

  it('accepte des dates absentes', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ startedAt: '', endedAt: '' }))

    expect(state.ok).toBe(true)
  })

  it('refuse une URL GitHub invalide', async () => {
    const state = await createProject(initialProjectFormState, buildFormData({ githubUrl: 'pas-une-url' }))

    expect(state.errors.githubUrl).toBeDefined()
  })

  it('enregistre une URL vide en null', async () => {
    await createProject(initialProjectFormState, buildFormData({ githubUrl: '' }))

    expect(tx.project.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ githubUrl: null }) }),
    )
  })

  it('rattache les tags dans l\'ordre soumis', async () => {
    await createProject(initialProjectFormState, buildFormData({}, { tagIds: ['t2', 't1'] }))

    expect(tx.projectTag.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: [
          { projectId: 'p1', tagId: 't2', displayOrder: 0 },
          { projectId: 'p1', tagId: 't1', displayOrder: 1 },
        ],
      }),
    )
  })

  it('ouvre une transaction', async () => {
    await createProject(initialProjectFormState, buildFormData())

    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it("invalide l'étiquette projects", async () => {
    await createProject(initialProjectFormState, buildFormData())

    expect(updateTag).toHaveBeenCalledWith('projects')
  })

  it("traduit une violation d'unicité de slug en erreur de champ", async () => {
    vi.mocked(prisma.$transaction).mockRejectedValueOnce({ code: 'P2002', meta: { target: ['slug'] } })

    const state = await createProject(initialProjectFormState, buildFormData())

    expect(state.message).toBe('slug_taken')
    expect(state.errors.slug).toBeDefined()
  })

  it("refuse un appel sans session, avant d'ouvrir la transaction", async () => {
    vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('UNAUTHORIZED'))

    await expect(createProject(initialProjectFormState, buildFormData())).rejects.toThrow()

    expect(prisma.$transaction).not.toHaveBeenCalled()
  })
})

describe('updateProject', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    tx.project.update.mockResolvedValue({ id: 'p1' })
  })

  it('supprime la méta client au passage en personnel', async () => {
    await updateProject('p1', initialProjectFormState, buildFormData({ type: 'PERSONAL' }))

    expect(tx.clientMeta.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'p1' } })
  })

  it('crée ou met à jour la méta client au passage en client', async () => {
    await updateProject(
      'p1',
      initialProjectFormState,
      buildFormData({ type: 'CLIENT', companyId: 'c1', workMode: 'REMOTE' }),
    )

    expect(tx.clientMeta.upsert).toHaveBeenCalled()
  })

  it('remplace intégralement le jeu de tags', async () => {
    await updateProject('p1', initialProjectFormState, buildFormData({}, { tagIds: ['t3'] }))

    expect(tx.projectTag.deleteMany).toHaveBeenCalledWith({ where: { projectId: 'p1' } })
    expect(tx.projectTag.createMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: [{ projectId: 'p1', tagId: 't3', displayOrder: 0 }] }),
    )
  })
})
```

Le mock de `$transaction` exécute la fonction reçue avec un client factice, ce qui permet de vérifier **quelles opérations ont eu lieu dedans** plutôt que de se contenter de constater qu'une transaction a été ouverte.

- [ ] **Step 2: Lancer les tests pour vérifier qu'ils échouent**

Run: `pnpm vitest run --project unit src/server/actions/projects.test.ts`
Expected: FAIL, le module `./projects` n'existe pas.

- [ ] **Step 3: Écrire les Server Actions**

```typescript
'use server'

import 'server-only'
import { revalidatePath, updateTag } from 'next/cache'

import { getCurrentUser } from '@/lib/get-current-user'
import { prisma } from '@/lib/prisma'
import { projectSchema, type ProjectInput } from '@/lib/schemas/project'
import { createActionLogger } from '@/lib/server-utils'

import { type ProjectFormState } from './projects.types'

type ZodFieldErrors = Partial<Record<keyof ProjectInput, string[]>>

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
    displayOrder: formData.get('displayOrder') ?? '0',
    tagIds: formData.getAll('tagIds'),
    companyId: formData.get('companyId') ?? '',
    workMode: formData.get('workMode') ?? '',
    contractStatus: formData.get('contractStatus') ?? '',
    teamSize: formData.get('teamSize') ?? '',
    deliverablesCount: formData.get('deliverablesCount') ?? '1',
  })
}

function collectValues(formData: FormData): ProjectFormState['values'] {
  const values: Record<string, string | string[]> = {}
  for (const key of new Set(formData.keys())) {
    const all = formData.getAll(key).map(String)
    values[key] = all.length > 1 ? all : (all[0] ?? '')
  }
  return values
}

// Champs du projet lui-même, séparés de ceux qui alimentent ClientMeta.
function projectData(input: ProjectInput) {
  const { tagIds, companyId, workMode, contractStatus, teamSize, deliverablesCount, ...project } = input
  return project
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
    return {
      ok: false,
      errors: result.error.flatten().fieldErrors as ZodFieldErrors,
      message: null,
      values,
    }
  }

  const input = result.data

  try {
    const project = await prisma.$transaction(async (tx) => {
      const created = await tx.project.create({ data: projectData(input) })

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
            displayOrder: index,
          })),
        })
      }

      return created
    })

    updateTag('projects')
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
    return {
      ok: false,
      errors: result.error.flatten().fieldErrors as ZodFieldErrors,
      message: null,
      values,
    }
  }

  const input = result.data

  try {
    await prisma.$transaction(async (tx) => {
      await tx.project.update({ where: { id }, data: projectData(input) })

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
            displayOrder: index,
          })),
        })
      }
    })

    updateTag('projects')
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
    await prisma.project.delete({ where: { id } })
    updateTag('projects')
    revalidatePath('/admin/projets')
    log.info({ event: 'project:deleted', id })
    return { ok: true, errors: {}, message: null }
  } catch (err) {
    log.error({ err, event: 'project:delete_failed' })
    return { ok: false, errors: {}, message: 'unknown_error' }
  }
}
```

`projectData` sépare par déstructuration les champs du projet de ceux qui alimentent la méta client : sans cette séparation, Prisma refuserait `companyId` sur `project.create`.

`await getCurrentUser()` ouvre les trois actions, hors du `try`. Le `catch` avalerait sinon l'interruption `unauthorized()` et la convertirait en `unknown_error`.

`deleteProject` n'a pas besoin de transaction : `ClientMeta` et `ProjectTag` portent `onDelete: Cascade` et disparaissent avec le projet. Les tags et l'entreprise, eux, portent `Restrict` et ne sont pas touchés.

- [ ] **Step 4: Lancer les tests pour vérifier qu'ils passent**

Run: `pnpm vitest run --project unit src/server/actions/projects.test.ts`
Expected: PASS, vingt-quatre cas verts.

Deux cas que la spec exige et qui manquaient à cette liste : un `status` absent de `ProjectStatus` est refusé, et un échec de validation renvoie les valeurs saisies dans l'état. Le second n'est pas cosmétique : c'est le repeuplement du formulaire après erreur, que le sub-project `13` tient pour non négociable.

---

### Task 3 : Requête d'administration

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
      clientMeta: { include: { company: { select: { id: true, name: true } } } },
      tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } },
    },
    orderBy: [{ displayOrder: 'asc' }, { slug: 'asc' }],
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

**Exporter le type de retour de chacune, ne jamais réutiliser `ProjectWithRelations`.** Ce dernier dérive de `PROJECT_INCLUDE` (`src/types/project.ts`), qui charge la `Company` entière ; les deux requêtes ci-dessus n'en prennent qu'une projection, voire rien. Les types ne sont pas assignables et `just typecheck` le refusera. Déclarer, à côté des requêtes :

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

### Task 4 : Vérifier sur données réelles

**Files:** aucun fichier du dépôt.

> Les tests couvrent la logique avec Prisma mocké. Cette tâche vérifie que les écritures réelles passent, ce qu'un mock ne peut pas prouver.

- [ ] **Step 1: Préparer une base de test à jour**

```bash
just db-test-reset
```

- [ ] **Step 2: Créer un projet client depuis un script temporaire**

Écrire un script jetable appelant `createProject` avec un `FormData` de type `CLIENT`, une entreprise du seed, un mode de travail et deux tags.

```sql
SELECT p.slug, cm."companyId", cm."workMode", count(pt."tagId") AS tags
FROM "Project" p
LEFT JOIN "ClientMeta" cm ON cm."projectId" = p.id
LEFT JOIN "ProjectTag" pt ON pt."projectId" = p.id
WHERE p.slug = '<slug>'
GROUP BY p.slug, cm."companyId", cm."workMode";
```

Expected: une ligne, avec la méta client renseignée et deux tags.

- [ ] **Step 3: Vérifier la bascule vers personnel**

Modifier ce projet en `PERSONAL`.

```sql
SELECT count(*) FROM "ClientMeta" cm
JOIN "Project" p ON p.id = cm."projectId"
WHERE p.slug = '<slug>';
```

Expected: zéro. La méta client a bien été supprimée.

- [ ] **Step 4: Vérifier le remplacement des tags**

Modifier le projet avec un seul tag différent.

```sql
SELECT pt."tagId", pt."displayOrder" FROM "ProjectTag" pt
JOIN "Project" p ON p.id = pt."projectId"
WHERE p.slug = '<slug>';
```

Expected: une seule ligne, portant le nouveau tag et `displayOrder` à zéro.

- [ ] **Step 5: Vérifier la suppression en cascade**

Supprimer le projet, puis compter les lignes orphelines.

```sql
SELECT
  (SELECT count(*) FROM "ClientMeta" WHERE "projectId" = '<id>') AS metas,
  (SELECT count(*) FROM "ProjectTag" WHERE "projectId" = '<id>') AS rattachements;
```

Expected: zéro des deux côtés. Et vérifier que les tags eux-mêmes existent toujours.

- [ ] **Step 6: Supprimer le script temporaire**

- [ ] **Step 7: Lancer la suite complète**

```bash
just test
```

Expected: tous les tests verts.

- [ ] **Step 8: Demander la validation avant commit**

Ne pas committer sans accord explicite de l'utilisateur sur le périmètre et le message. Message proposé :

```
feat(admin): Server Actions des projets
```
