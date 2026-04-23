# Page `/projets` — Liste BentoGrid filtrable — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Page publique `/[locale]/(public)/projets/` affichant les projets PUBLISHED en BentoGrid filtrable, card entière cliquable vers `/[locale]/projets/[slug]`, i18n FR/EN, metadata SEO localisée, 1 test Vitest sur la logique filter.

**Architecture:** Server Component page.tsx (SSR + generateMetadata) + Client Component ProjectsList (useState filter) + ProjectFilters (Tabs custom minimaliste, sémantique ARIA native) + ProjectCard (BentoCard Magic UI + Link Next.js englobant) + TagBadge (Simple Icons).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript 6, next-intl 4, Tailwind 4, shadcn/ui + Magic UI, @icons-pack/react-simple-icons, motion/react, Vitest 4, Testing Library 16.

**Spec source:** [docs/superpowers/specs/projets/05-page-liste-projets-filtres-design.md](../../specs/projets/05-page-liste-projets-filtres-design.md)

**Prérequis externes :** sub-projects `01-schema-prisma-project` (avec `coverFilename`), `02-client-prisma-queries` (singleton + `findManyPublished`), `03-seed-projets` (au moins 1-2 projets seedés) doivent être implémentés. Recommandé mais pas bloquant : `04-route-api-assets` (sans, les covers afficheront le fallback gradient).

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `src/components/magicui/bento-grid.tsx` | Install (shadcn CLI) | BentoGrid + BentoCard Magic UI |
| `src/components/features/projects/TagBadge.tsx` | Create | Badge shadcn + Simple Icon |
| `src/components/features/projects/ProjectCard.tsx` | Create | BentoCard cliquable (Link englobant) |
| `src/components/features/projects/ProjectFilters.tsx` | Create | Tabs controlled 3 onglets |
| `src/components/features/projects/ProjectsList.tsx` | Create | useState filter + grille |
| `src/components/features/projects/__tests__/ProjectsList.test.tsx` | Create | 1 test filtrage |
| `src/app/[locale]/(public)/projets/page.tsx` | Create | Server Component SSR + generateMetadata |
| `messages/fr.json` | Modify | Section `Projects` FR |
| `messages/en.json` | Modify | Section `Projects` EN |

---

### Task 1: Prérequis — vérifier l'environnement

- [ ] **Step 1: Vérifier que les sub-projects 01/02/03 sont implémentés**

Run:
```bash
ls src/lib/prisma.ts src/server/queries/projects.ts src/types/project.ts prisma/seed.ts 2>&1
```
Expected : les 4 fichiers existent. Si absents : `/implement-subproject projets 01` (puis 02, 03) d'abord.

- [ ] **Step 2: Vérifier qu'il y a des projets PUBLISHED en BDD**

Run:
```bash
docker compose exec postgres psql -U portfolio -d portfolio -c "SELECT slug, type, status FROM \"Project\" WHERE status='PUBLISHED' LIMIT 10;"
```
Expected : au moins 1 row. Si 0 : `just seed` puis vérifier que le contenu des fichiers `seed-data/*.ts` contient au moins 1 projet avec `status: 'PUBLISHED'`.

- [ ] **Step 3: Vérifier `@icons-pack/react-simple-icons` installé**

Run:
```bash
grep "@icons-pack/react-simple-icons" package.json
```
Expected : `"@icons-pack/react-simple-icons": "13.13.0"` (déjà dans `dependencies` du `package.json` initial). Si absent : `pnpm add @icons-pack/react-simple-icons`.

- [ ] **Step 4: Vérifier `motion` installé**

Run:
```bash
grep '"motion"' package.json
```
Expected : `"motion": "^12.0.0"` présent. Si absent : `pnpm add motion`.

---

### Task 2: Installer BentoGrid (Magic UI) via shadcn CLI

**Files:**
- Create (via CLI) : `src/components/magicui/bento-grid.tsx`

- [ ] **Step 1: Vérifier la config shadcn pour registry Magic UI**

Run:
```bash
cat components.json | grep -A 2 registries
```
Expected : un registry pointant vers Magic UI (ex: `"@magicui": "https://magicui.design/r/{name}"`). Si absent : le configurer manuellement dans `components.json` (section `registries`).

- [ ] **Step 2: Lancer l'install via shadcn CLI**

Run:
```bash
pnpm dlx shadcn@latest add "@magicui/bento-grid"
```

Si la commande est interactive (TUI), arrêter et demander à l'utilisateur d'exécuter la commande dans son terminal, attendre confirmation, puis fallback manuel (copier depuis la doc Magic UI).

Expected : fichier `src/components/magicui/bento-grid.tsx` créé, exportant `BentoGrid` et `BentoCard`.

- [ ] **Step 3: Vérifier l'export**

Run:
```bash
grep -E "^export" src/components/magicui/bento-grid.tsx
```
Expected : au moins `export function BentoGrid` et `export function BentoCard` (ou équivalent).

---

### Task 3: Créer `TagBadge`

**Files:**
- Create: `src/components/features/projects/TagBadge.tsx`

- [ ] **Step 1: Créer le dossier et le fichier**

Run:
```bash
mkdir -p src/components/features/projects
```

Créer `src/components/features/projects/TagBadge.tsx` avec ce contenu exact :

```typescript
'use client'

import type { Tag } from '@/generated/prisma/client'
import * as SimpleIcons from '@icons-pack/react-simple-icons'
import * as LucideIcons from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type IconComponent = React.ComponentType<{ size?: number; className?: string }>

type Props = {
  tag: Pick<Tag, 'name' | 'icon'>
  className?: string
}

/**
 * Résout le composant d'icône Simple Icons depuis un slug.
 * Les composants sont exportés sous la forme `SiReact`, `SiPostgresql`, etc.
 * Le mapping slug → nom de composant = 'Si' + PascalCase du slug.
 */
function resolveSimpleIcon(slug: string): IconComponent | null {
  const pascalCase = slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const componentName = `Si${pascalCase}`
  const maybeComponent = (SimpleIcons as unknown as Record<string, unknown>)[componentName]
  return typeof maybeComponent === 'function' ? (maybeComponent as IconComponent) : null
}

/**
 * Résout le composant d'icône Lucide depuis un slug kebab-case.
 * Les composants sont exportés en PascalCase (ex: 'spider' → `Spider`, 'eye-off' → `EyeOff`).
 */
function resolveLucideIcon(slug: string): IconComponent | null {
  const pascalCase = slug
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('')
  const maybeComponent = (LucideIcons as unknown as Record<string, unknown>)[pascalCase]
  return typeof maybeComponent === 'function' ? (maybeComponent as IconComponent) : null
}

/**
 * Résout l'icône depuis le format `"<lib>:<slug>"`.
 * Retourne null si le format est invalide ou si le composant n'existe pas dans la lib.
 */
function resolveTagIcon(icon: string | null): IconComponent | null {
  if (!icon) return null
  const colonIdx = icon.indexOf(':')
  if (colonIdx === -1) return null
  const lib = icon.slice(0, colonIdx)
  const slug = icon.slice(colonIdx + 1)
  if (!slug) return null
  if (lib === 'simple-icons') return resolveSimpleIcon(slug)
  if (lib === 'lucide') return resolveLucideIcon(slug)
  return null
}

export function TagBadge({ tag, className }: Props) {
  const Icon = resolveTagIcon(tag.icon)

  return (
    <Badge variant="secondary" className={cn('gap-1.5', className)}>
      {Icon ? <Icon size={14} className="shrink-0" /> : null}
      <span>{tag.name}</span>
    </Badge>
  )
}
```

- [ ] **Step 2: Vérifier `Badge` shadcn et `lucide-react` installés**

Run:
```bash
ls src/components/ui/badge.tsx 2>&1 || echo "BADGE MISSING"
grep '"lucide-react"' package.json || echo "LUCIDE MISSING"
```

Si `BADGE MISSING` :
```bash
pnpm dlx shadcn@latest add badge
```

Si `LUCIDE MISSING` :
```bash
pnpm add lucide-react
```
(Normalement déjà présent : c'est la lib d'icônes par défaut de shadcn, installée avec la première commande `shadcn add`.)

- [ ] **Step 3: Typecheck**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur. Si erreur sur le typage dynamique, simplifier avec un `Record<string, IconComponent>` statique des tags les plus fréquents.

---

### Task 4: Créer `ProjectCard` (Client Component)

**Files:**
- Create: `src/components/features/projects/ProjectCard.tsx`

- [ ] **Step 1: Créer le composant**

Créer `src/components/features/projects/ProjectCard.tsx` avec ce contenu exact :

```typescript
'use client'

import Image from 'next/image'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import type { ProjectWithRelations } from '@/types/project'
import { Badge } from '@/components/ui/badge'
import { BentoCard } from '@/components/magicui/bento-grid'
import { TagBadge } from './TagBadge'
import { cn } from '@/lib/utils'

type Props = {
  project: ProjectWithRelations
}

const MAX_VISIBLE_TAGS = 3

export function ProjectCard({ project }: Props) {
  const t = useTranslations('Projects')
  const tFormats = useTranslations('Projects.formats')
  // project.tags est un array de ProjectTag déjà trié `displayOrder asc` côté query
  // (cf. findManyPublished sub-project 02). On prend juste les 3 premiers.
  const visibleProjectTags = project.tags.slice(0, MAX_VISIBLE_TAGS)
  const extraCount = Math.max(0, project.tags.length - MAX_VISIBLE_TAGS)
  const isInProgress = project.endedAt === null
  const company = project.clientMeta?.company

  return (
    <article
      className={cn(
        'group relative transition-all duration-200 ease-out hover:scale-[1.02] hover:shadow-md',
      )}
    >
      <Link
        href={{ pathname: '/projets/[slug]', params: { slug: project.slug } }}
        className="block"
        aria-label={t('cardAriaLabel', { title: project.title })}
      >
        <BentoCard className="flex h-full flex-col overflow-hidden">
          {/* Cover image ou gradient fallback */}
          <div className="relative h-40 w-full overflow-hidden rounded-t-lg">
            {project.coverFilename ? (
              <Image
                src={`/api/assets/${project.coverFilename}`}
                alt={project.title}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover"
              />
            ) : (
              <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
            )}
          </div>

          {/* Bandeau méta : Entreprise inline (logo + nom, sans badge) + badge En cours */}
          <div className="flex flex-wrap items-center gap-3 px-4 pt-3">
            {company ? (
              <div className="flex items-center gap-1.5">
                {company.logoFilename ? (
                  <Image
                    src={`/api/assets/${company.logoFilename}`}
                    alt={company.name}
                    width={20}
                    height={20}
                    className="rounded object-contain"
                  />
                ) : null}
                <span className="text-sm text-muted-foreground">{company.name}</span>
              </div>
            ) : null}
            {isInProgress ? (
              <Badge variant="default" className="gap-1.5 text-xs">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-green-500" />
                </span>
                {t('inProgress')}
              </Badge>
            ) : null}
          </div>

          {/* Titre + Formats (outline sans icône) + description */}
          <div className="flex flex-col gap-2 p-4">
            <h3 className="text-xl font-semibold tracking-tight">{project.title}</h3>

            {project.formats.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {project.formats.map((format) => (
                  <Badge key={format} variant="outline" className="text-xs font-normal">
                    {tFormats(format)}
                  </Badge>
                ))}
              </div>
            ) : null}

            <p className="text-sm text-muted-foreground line-clamp-3">{project.description}</p>

            {/* Badges Tag (expertises + technos, ordre ProjectTag.displayOrder asc — 0 en premier,
                pré-trié côté query). Chaque entrée est un ProjectTag portant le Tag en relation. */}
            <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
              {visibleProjectTags.map((projectTag) => (
                <TagBadge key={projectTag.tag.slug} tag={projectTag.tag} />
              ))}
              {extraCount > 0 ? (
                <Badge variant="outline" className="text-xs">
                  +{extraCount}
                </Badge>
              ) : null}
            </div>
          </div>
        </BentoCard>
      </Link>
    </article>
  )
}
```

- [ ] **Step 2: Vérifier l'import de `Link` next-intl**

Run:
```bash
ls src/i18n/navigation.ts 2>&1
```
Expected : fichier présent (créé au sub-project support-multilingue). Si absent : utiliser `import Link from 'next/link'` en fallback.

- [ ] **Step 3: Typecheck**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 5: Créer `ProjectFilters` (Client Component)

**Files:**
- Create: `src/components/features/projects/ProjectFilters.tsx`

- [ ] **Step 1: Créer le fichier**

Créer `src/components/features/projects/ProjectFilters.tsx` avec ce contenu exact :

```typescript
'use client'

import { useTranslations } from 'next-intl'

export type ProjectsFilter = 'ALL' | 'CLIENT' | 'PERSONAL'

type Props = {
  value: ProjectsFilter
  onChange: (next: ProjectsFilter) => void
}

export function ProjectFilters({ value, onChange }: Props) {
  const t = useTranslations('Projects.filters')

  const tabs = [
    { value: 'ALL' as const, label: t('all') },
    { value: 'CLIENT' as const, label: t('client') },
    { value: 'PERSONAL' as const, label: t('personal') },
  ]

  return (
    <div className="flex justify-center" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          role="tab"
          aria-selected={value === tab.value}
          onClick={() => onChange(tab.value)}
          className={
            value === tab.value
              ? 'px-4 py-2 font-medium border-b-2 border-primary'
              : 'px-4 py-2 text-muted-foreground hover:text-foreground transition-colors'
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
```

Note : l'implémentation ci-dessus est un Tabs minimaliste custom qui garantit la sémantique `role="tablist"` + `role="tab"` + `aria-selected` (requis par le test `ProjectsList.test.tsx` Task 7) et s'appuie sur les tokens Tailwind du projet (`border-primary`, `text-muted-foreground`). Aceternity UI n'est volontairement pas installé pour ce sub-project — si un style animé plus riche est souhaité ultérieurement, envelopper ce composant dans un wrapper Aceternity plutôt que de remplacer la structure ARIA.

- [ ] **Step 2: Typecheck**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 6: Ajouter les clés i18n dans `messages/fr.json` et `messages/en.json`

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Ajouter la section `Projects` dans `messages/fr.json`**

Ouvrir `messages/fr.json`, ajouter la clé `Projects` (au même niveau que les autres clés top-level) :

```json
  "Projects": {
    "metaTitle": "Projets",
    "metaDescription": "Sélection de projets clients et personnels en développement full-stack et IA",
    "pageTitle": "Mes projets",
    "pageSubtitle": "Missions freelance et projets personnels",
    "filters": {
      "all": "Tous",
      "client": "Clients",
      "personal": "Personnels"
    },
    "formats": {
      "API": "API",
      "WEB_APP": "Web App",
      "MOBILE_APP": "App Mobile",
      "DESKTOP_APP": "Desktop App",
      "CLI": "CLI",
      "IA": "IA"
    },
    "inProgress": "En cours",
    "emptyState": "Aucun projet à afficher dans cette catégorie pour le moment.",
    "cardAriaLabel": "Voir le projet {title}"
  }
```

- [ ] **Step 2: Ajouter la même section dans `messages/en.json`**

Ouvrir `messages/en.json`, ajouter :

```json
  "Projects": {
    "metaTitle": "Projects",
    "metaDescription": "Selected client and personal projects in full-stack development and AI",
    "pageTitle": "My projects",
    "pageSubtitle": "Freelance missions and personal projects",
    "filters": {
      "all": "All",
      "client": "Client",
      "personal": "Personal"
    },
    "formats": {
      "API": "API",
      "WEB_APP": "Web App",
      "MOBILE_APP": "Mobile App",
      "DESKTOP_APP": "Desktop App",
      "CLI": "CLI",
      "IA": "AI"
    },
    "inProgress": "In progress",
    "emptyState": "No projects to display in this category yet.",
    "cardAriaLabel": "View project {title}"
  }
```

- [ ] **Step 3: Vérifier la validité JSON**

Run:
```bash
pnpm exec node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('✔ JSON valides')"
```
Expected : `✔ JSON valides`.

- [ ] **Step 4: Typecheck (types next-intl re-générés)**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur. Si erreur "Property 'Projects' does not exist" : le fichier d'augmentation AppConfig doit re-importer les messages. Typiquement déjà en place côté sub-project support-multilingue.

---

### Task 7: Écrire le test `ProjectsList.test.tsx` (TDD : avant l'impl)

**Files:**
- Create: `src/components/features/projects/__tests__/ProjectsList.test.tsx`

- [ ] **Step 1: Créer le dossier et le fichier de test**

Run:
```bash
mkdir -p src/components/features/projects/__tests__
```

Créer `src/components/features/projects/__tests__/ProjectsList.test.tsx` avec ce contenu exact :

```typescript
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { ProjectWithRelations } from '@/types/project'
import { ProjectsList } from '../ProjectsList'

// Mock next-intl pour éviter de setup un NextIntlClientProvider dans le test
vi.mock('next-intl', async (orig) => {
  const actual = await orig<typeof import('next-intl')>()
  return {
    ...actual,
    useTranslations: () => (key: string) => key,
  }
})

// Mock Link next-intl
vi.mock('@/i18n/navigation', () => ({
  Link: ({ children, ...props }: { children: React.ReactNode }) => <a {...props}>{children}</a>,
}))

// Mock les composants shadcn/magicui qui dépendent de browser APIs
vi.mock('@/components/magicui/bento-grid', () => ({
  BentoGrid: ({ children }: { children: React.ReactNode }) => <div data-testid="bento-grid">{children}</div>,
  BentoCard: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const baseProject: ProjectWithRelations = {
  id: 'id',
  slug: 'slug',
  title: 'Project',
  description: 'Desc',
  type: 'CLIENT',
  status: 'PUBLISHED',
  formats: [],
  startedAt: null,
  endedAt: null,
  githubUrl: null,
  demoUrl: null,
  coverFilename: null,
  caseStudyMarkdown: null,
  displayOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  // `tags` est un ProjectTag[] nested — chaque entrée porte displayOrder + relation tag.
  tags: [],
  clientMeta: null,
}

const fixtures: ProjectWithRelations[] = [
  { ...baseProject, id: '1', slug: 'p1', title: 'Client Project 1', type: 'CLIENT' },
  { ...baseProject, id: '2', slug: 'p2', title: 'Personal Project 1', type: 'PERSONAL' },
  { ...baseProject, id: '3', slug: 'p3', title: 'Client Project 2', type: 'CLIENT' },
]

describe('ProjectsList filter', () => {
  it('affiche tous les projets par défaut, filtre correctement CLIENT/PERSONAL', () => {
    render(<ProjectsList projects={fixtures} />)

    // Par défaut : tous les projets visibles
    expect(screen.getAllByRole('article')).toHaveLength(3)

    // Clic sur 'Clients' : 2 visibles
    fireEvent.click(screen.getByRole('tab', { name: /client/i }))
    expect(screen.getAllByRole('article')).toHaveLength(2)

    // Clic sur 'Personnels' : 1 visible
    fireEvent.click(screen.getByRole('tab', { name: /personal/i }))
    expect(screen.getAllByRole('article')).toHaveLength(1)

    // Clic sur 'Tous' : 3 visibles à nouveau
    fireEvent.click(screen.getByRole('tab', { name: /all/i }))
    expect(screen.getAllByRole('article')).toHaveLength(3)
  })
})
```

- [ ] **Step 2: Run le test — doit FAIL (ProjectsList pas créé)**

Run:
```bash
pnpm vitest run ProjectsList.test
```
Expected : FAIL avec `Cannot find module '../ProjectsList'`.

---

### Task 8: Créer `ProjectsList` (Client Component) — faire passer le test

**Files:**
- Create: `src/components/features/projects/ProjectsList.tsx`

- [ ] **Step 1: Créer le fichier**

Créer `src/components/features/projects/ProjectsList.tsx` avec ce contenu exact :

```typescript
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { ProjectWithRelations } from '@/types/project'
import { BentoGrid } from '@/components/magicui/bento-grid'
import { ProjectCard } from './ProjectCard'
import { ProjectFilters, type ProjectsFilter } from './ProjectFilters'

type Props = {
  projects: ProjectWithRelations[]
}

export function ProjectsList({ projects }: Props) {
  const t = useTranslations('Projects')
  const [filter, setFilter] = useState<ProjectsFilter>('ALL')

  const visible = filter === 'ALL' ? projects : projects.filter((p) => p.type === filter)

  return (
    <div className="flex flex-col gap-8">
      <ProjectFilters value={filter} onChange={setFilter} />

      {visible.length === 0 ? (
        <p className="text-center text-muted-foreground">{t('emptyState')}</p>
      ) : (
        <BentoGrid>
          {visible.map((project) => (
            <ProjectCard key={project.slug} project={project} />
          ))}
        </BentoGrid>
      )}
    </div>
  )
}
```

Note : `ProjectCard` (Task 4) et `TagBadge` (Task 3) sont déjà Client Components, donc leur rendu dans ce `ProjectsList` via `.map()` est direct et valide.

- [ ] **Step 2: Run le test — doit PASS**

Run:
```bash
pnpm vitest run ProjectsList.test
```
Expected : 1 test PASS.

Si FAIL :
- `screen.getByRole('tab', { name: /client/i })` introuvable → vérifier que `ProjectFilters` a bien `role="tab"` et que les labels contiennent bien le mot (grâce au mock next-intl qui renvoie les clés brutes `client`, `personal`, `all`).
- `screen.getAllByRole('article')` retourne 0 → vérifier que `ProjectCard` a bien `<article>` en tag racine (Task 4).

---

### Task 9: Créer la page Server Component `projets/page.tsx`

Règle : [.claude/rules/nextjs/metadata-seo.md](../../../../.claude/rules/nextjs/metadata-seo.md), [.claude/rules/next-intl/setup.md](../../../../.claude/rules/next-intl/setup.md).

**Files:**
- Create: `src/app/[locale]/(public)/projets/page.tsx`

- [ ] **Step 1: Créer le fichier**

Créer `src/app/[locale]/(public)/projets/page.tsx` avec ce contenu exact :

```typescript
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from '@/i18n/routing'
import { findManyPublished } from '@/server/queries/projects'
import { ProjectsList } from '@/components/features/projects/ProjectsList'

type PageProps = {
  params: Promise<{ locale: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'Projects' })

  return {
    title: t('metaTitle'),
    description: t('metaDescription'),
    alternates: {
      languages: {
        fr: '/fr/projets',
        en: '/en/projets',
      },
    },
  }
}

export default async function ProjetsPage({ params }: PageProps) {
  const { locale } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const t = await getTranslations({ locale, namespace: 'Projects' })
  const projects = await findManyPublished()

  return (
    <main className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-24">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">{t('pageTitle')}</h1>
        <p className="mt-4 text-lg text-muted-foreground">{t('pageSubtitle')}</p>
      </header>

      <ProjectsList projects={projects} />
    </main>
  )
}
```

- [ ] **Step 2: Typecheck**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 10: Smoke test browser

**Files:** (validation live)

- [ ] **Step 1: Démarrer le serveur dev**

Run:
```bash
just dev &
```
Attendre ~5s que le serveur soit prêt sur http://localhost:3000.

- [ ] **Step 2: Accéder à `/fr/projets` et vérifier**

Ouvrir http://localhost:3000/fr/projets dans le navigateur.

Vérifier visuellement :
- Le titre "Mes projets" et le sous-titre sont affichés
- Les 3 onglets "Tous / Clients / Personnels" sont visibles, "Tous" actif
- Au moins 1 card projet est visible (si le seed a été exécuté)
- Chaque card a : cover image (ou gradient fallback), titre, description, 3 premiers badges Tag du projet (ordre `ProjectTag.displayOrder` asc pré-trié côté query — 0 en premier, mélange expertises + technos), badge "+N" si plus de 3 tags, badge entreprise si CLIENT, badge "En cours" si applicable
- Clic sur "Clients" : seuls les CLIENT visibles
- Clic sur "Personnels" : seuls les PERSONAL visibles
- Clic sur "Tous" : tous visibles à nouveau
- Hover sur une card : scale légèrement + shadow
- Clic sur une card : navigue vers `/fr/projets/<slug>` (404 attendue tant que sub-project 06 pas implémenté)

- [ ] **Step 3: Vérifier la version EN**

Ouvrir http://localhost:3000/en/projets.

Vérifier : titre "My projects", onglets "All / Client / Personal", descriptions traduites.

- [ ] **Step 4: Inspecter la metadata HTML**

Run:
```bash
curl -s http://localhost:3000/fr/projets | grep -E "(<title>|<meta name=\"description\"|hreflang)"
```
Expected : balises avec les valeurs localisées + `<link rel="alternate" hreflang="en" ...>`.

- [ ] **Step 5: Arrêter le serveur**

Run:
```bash
just stop 2>/dev/null || true
```

---

### Task 11: Qualité + commit

- [ ] **Step 1: Lint**

Run:
```bash
just lint
```
Expected : 0 erreur, 0 warning.

- [ ] **Step 2: Typecheck**

Run:
```bash
just typecheck
```
Expected : 0 erreur.

- [ ] **Step 3: Tests (unit + integration)**

Run:
```bash
just test
```
Expected : tous les tests passent (incluant le nouveau `ProjectsList.test.tsx`).

- [ ] **Step 4: Stager et committer**

Run:
```bash
git add src/app/\[locale\]/\(public\)/projets/ src/components/features/projects/ src/components/magicui/ messages/fr.json messages/en.json
git commit -m "$(cat <<'EOF'
feat(projets): page /projets avec BentoGrid filtrable + cards cliquables

- src/app/[locale]/(public)/projets/page.tsx : Server Component SSR + generateMetadata localisé
- src/components/features/projects/ProjectsList.tsx : filtrage client-side (useState) Tous/Clients/Perso
- src/components/features/projects/ProjectFilters.tsx : Tabs custom minimaliste (sémantique role/aria)
- src/components/features/projects/ProjectCard.tsx : BentoCard cliquable + cover image via /api/assets
- src/components/features/projects/TagBadge.tsx : badge unifié qui switch Simple Icons (`simple-icons:*`) ou Lucide (`lucide:*`) selon le préfixe de `tag.icon`, fallback texte si null
- src/components/magicui/bento-grid.tsx : BentoGrid + BentoCard (shadcn CLI)
- messages/fr.json + en.json : section Projects (titres, filtres, emptyState)
- 1 test Vitest sur la logique filter

Spec: docs/superpowers/specs/projets/05-page-liste-projets-filtres-design.md
EOF
)"
```

- [ ] **Step 5: Vérifier le commit**

Run:
```bash
git log -1 --stat
```
Expected : commit récent listant les fichiers attendus.

---

## Self-Review

**1. Spec coverage** :
- ✅ `Scope` page + composants + i18n + test → Tasks 3-9
- ✅ `État livré` (navigateur /fr /en, filtres, cards) → Task 10 smoke test
- ✅ `Dependencies` 01 + 02 + 03 → Task 1 prérequis + Step 2 vérifie rows BDD
- ✅ `Files touched` tous mappés :
  - `src/app/[locale]/(public)/projets/page.tsx` (T9)
  - `ProjectsList.tsx` (T8), `ProjectFilters.tsx` (T5), `ProjectCard.tsx` (T4), `TagBadge.tsx` (T3)
  - `__tests__/ProjectsList.test.tsx` (T7)
  - `magicui/bento-grid.tsx` (T2)
  - `messages/fr.json` + `messages/en.json` (T6)
- ✅ `Architecture approach` :
  - Server Component page avec `setRequestLocale` + `hasLocale` → T9 ✓
  - `generateMetadata` avec alternates → T9 ✓
  - Client Components `ProjectsList` + `ProjectFilters` + `ProjectCard` + `TagBadge` (tous créés Client dès le départ, cohérent avec spec 05) ✓
  - Filtrage client via useState + array.filter ✓
  - BentoGrid + BentoCard Magic UI ✓
  - `coverFilename` → `/api/assets/<filename>` avec fallback gradient ✓
  - Bloc entreprise inline (logo + nom) via `clientMeta.company` conditionnel ✓
  - Badges Format outline sans icône sous le titre ✓
  - Badge `En cours` si `endedAt === null` ✓
  - 3 premiers tags du projet (ordre `ProjectTag.displayOrder` asc pré-trié côté query) + `+N` ✓
  - Hover scale + shadow via Tailwind ✓
- ✅ `Acceptance criteria` :
  - Scénario 1 (rendu FR) → T10 step 2
  - Scénario 2 (filtrage Clients) → T7 test + T10 step 2
  - Scénario 3 (filtrage Perso) → T7 test + T10 step 2
  - Scénario 4 (nav case study) → T10 step 2 (404 attendu)
  - Scénario 5 (bascule FR/EN) → T10 step 3 + T10 step 4 (hreflang)
  - Scénario 6 (empty state) → couvert par code `ProjectsList` (T8) qui affiche `emptyState` si `visible.length === 0`
  - Scénario 7 (cover absente) → couvert par `ProjectCard` (T4) avec gradient fallback
- ✅ `tdd_scope = partial` → 1 test (T7), ok
- ✅ **Alignement spec ↔ plan** : `ProjectCard` + `TagBadge` sont Client Components dans le spec 05 et dans le plan (Task 3 + Task 4), créés directement avec `'use client'` sans conversion tardive. `ProjectFilters` est un Tabs custom minimaliste — Aceternity UI n'est pas installé ni importé pour ce sub-project (cohérent avec `Tech Stack` header et File Structure).

**2. Placeholder scan** : aucun TBD/TODO. Exception assumée :
- T2 mentionne "si le registry est différent, fallback manuel" — c'est un fallback CLI documenté, pas un placeholder applicatif.

**3. Type consistency** :
- `ProjectWithRelations` : défini sub-project 02 (`src/types/project.ts`), importé dans T4, T7, T8.
- `ProjectsFilter` : défini T5 (`ProjectFilters.tsx`), importé T8.
- `findManyPublished` : importé T9 depuis `@/server/queries/projects` (défini sub-project 02).
- Clés i18n : `Projects.metaTitle`, `filters.all/client/personal`, `formats.API/WEB_APP/MOBILE_APP/DESKTOP_APP/CLI/IA`, `inProgress`, `emptyState`, `cardAriaLabel`, `pageTitle`, `pageSubtitle` : définies T6, utilisées T4/T5/T9.

---

## Prochaine étape

Après exécution de ce plan : passer au dernier sub-project `06-page-case-study` (décision BDD vs MDX à trancher au brainstorming). Pour lancer l'implémentation de ce plan maintenant : `/implement-subproject projets 05`.
