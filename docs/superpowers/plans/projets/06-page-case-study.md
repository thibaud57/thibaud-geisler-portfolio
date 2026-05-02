# Page `/projets/[slug]`: Case Study: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Page case study détaillée `/[locale]/(public)/projets/[slug]` avec `generateStaticParams` (slugs PUBLISHED × 2 locales), `generateMetadata` localisé, composants layout (header + stack groupé par kind + markdown + footer), rendu via `react-markdown` + `@tailwindcss/typography`.

**Architecture:** Server Component page.tsx qui charge le projet via `findPublishedBySlug`, retourne `notFound()` sur DRAFT/absent, et rend `CaseStudyLayout` (composite : header cover+meta → markdown react-markdown → stack groupé par `TagKind` dans l'ordre fixe `EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA` (tri `ProjectTag.displayOrder` asc dans chaque groupe, pas alphabétique) → footer liens). Test Vitest ciblé sur `generateStaticParams`.

**Tech Stack:** Next.js 16, React 19, TypeScript 6, Tailwind 4, next-intl 4, Prisma 7, `react-markdown` + `remark-gfm` + `@tailwindcss/typography`, Vitest 4.

**Spec source:** [docs/superpowers/specs/projets/06-page-case-study-design.md](../../specs/projets/06-page-case-study-design.md)

**Prérequis externes :** sub-projects 01 (`caseStudyMarkdown` ajouté), 02 (`findPublishedBySlug` incluant le champ scalar), 03 (projets seedés avec au moins 1 `caseStudyMarkdown` rempli), 05 (`TagBadge` existant). Recommandé : 04 implémenté pour servir cover + screenshots inline.

---

## File Structure

| Fichier | Action | Responsabilité |
|---|---|---|
| `package.json` | Modify | Ajout `react-markdown` + `remark-gfm` + `@tailwindcss/typography` |
| `src/app/globals.css` | Modify | Activer plugin typography Tailwind 4 via `@plugin` |
| `src/components/features/projects/TagStackGrouped.tsx` | Create | Tous les tags du projet groupés par TagKind dans l'ordre fixe EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA, tri `ProjectTag.displayOrder` asc dans chaque groupe |
| `src/components/features/projects/CaseStudyMarkdown.tsx` | Create | ReactMarkdown + Image wrapper custom |
| `src/components/features/projects/CaseStudyHeader.tsx` | Create | Cover image + title + meta structurées |
| `src/components/features/projects/CaseStudyFooter.tsx` | Create | Liens démo/GitHub + retour liste |
| `src/components/features/projects/CaseStudyLayout.tsx` | Create | Orchestration sections (Header → Markdown → TagStackGrouped → Footer) |
| `messages/fr.json` | Modify | Ajout clés `Projects.caseStudy.*` (incl. `kind.EXPERTISE`) |
| `messages/en.json` | Modify | Ajout clés `Projects.caseStudy.*` (incl. `kind.EXPERTISE`) |
| `tests/integration/case-study-page.integration.test.ts` | Create | Test Vitest `generateStaticParams` |
| `src/app/[locale]/(public)/projets/[slug]/page.tsx` | Create | Server Component page + generateStaticParams + generateMetadata |

---

### Task 1: Prérequis

- [ ] **Step 1: Vérifier sub-projects 01/02/03/05 implémentés**

Run:
```bash
ls src/lib/prisma.ts src/server/queries/projects.ts src/types/project.ts prisma/seed.ts src/components/features/projects/TagBadge.tsx src/app/\[locale\]/\(public\)/projets/page.tsx 2>&1
```
Expected : les 6 fichiers existent.

- [ ] **Step 2: Vérifier qu'au moins 1 projet seedé a `caseStudyMarkdown` rempli**

Run:
```bash
docker compose exec postgres psql -U portfolio -d portfolio -c "SELECT slug, CASE WHEN \"caseStudyMarkdown\" IS NULL THEN 'null' ELSE 'filled' END FROM \"Project\" WHERE status='PUBLISHED' LIMIT 5;"
```
Expected : au moins 1 row avec `filled`. Si 0 : créer un fichier `.md` dans le sous-dossier approprié (`prisma/seed-data/case-studies/client/<slug>.md` pour un projet CLIENT, `case-studies/personal/<slug>.md` pour un PERSONAL), puis `just seed`.

---

### Task 2: Installer les deps markdown

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Installer les packages**

Run:
```bash
pnpm add react-markdown remark-gfm
pnpm add -D @tailwindcss/typography
```

Expected : les 3 packages apparaissent dans `package.json` (2 en `dependencies`, 1 en `devDependencies`).

- [ ] **Step 2: Vérifier versions compatibles**

Run:
```bash
grep -E "(react-markdown|remark-gfm|@tailwindcss/typography)" package.json
```
Expected : 3 lignes présentes avec versions récentes (`react-markdown` ≥ 10, `remark-gfm` ≥ 4, `@tailwindcss/typography` ≥ 0.5 compatible Tailwind 4).

---

### Task 3: Activer plugin typography dans `globals.css` (Tailwind 4)

Règle : [.claude/rules/tailwind/conventions.md](../../../../.claude/rules/tailwind/conventions.md) (Tailwind 4, plugins via `@plugin`).

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Ajouter la directive @plugin**

Ouvrir `src/app/globals.css`, ajouter après la ligne `@import "tailwindcss";` (ou équivalent) :

```css
@plugin "@tailwindcss/typography";
```

Cette syntaxe est propre à Tailwind 4 (plus de `tailwind.config.*`). Le plugin expose les classes `prose`, `prose-lg`, `prose-invert`, etc.

- [ ] **Step 2: Vérifier que Tailwind compile**

Run:
```bash
just dev &
sleep 3
curl -sI http://localhost:3000 | head -1
just stop 2>/dev/null || true
```
Expected : HTTP 200 sur la home (compilation Tailwind OK, pas d'erreur au démarrage).

---

### Task 4 + 5: Créer `TagStackGrouped` (tous les tags groupés par kind dans l'ordre fixe EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA)

Justification : le design case study (cf. spec 06) place **tous les tags** dans une section unique groupée par `TagKind`, avec `EXPERTISE` en tête dans l'ordre fixe `EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA`. Dans chaque groupe, tri par `ProjectTag.displayOrder` ASC (pas alphabétique). Le composant reçoit l'array `ProjectTag[]` tel que retourné par la query (déjà trié côté serveur), effectue le groupement par `tag.kind`, et rend les groupes dans l'ordre fixe.

**Files:**
- Create: `src/components/features/projects/TagStackGrouped.tsx`

- [ ] **Step 1: Créer le composant**

Créer `src/components/features/projects/TagStackGrouped.tsx` avec ce contenu exact :

```typescript
import { useTranslations } from 'next-intl'
import type { Prisma, TagKind } from '@/generated/prisma/client'
import { TagBadge } from './TagBadge'

// Type d'une row ProjectTag incluant sa relation `tag` (shape exact retourné par la query
// findPublishedBySlug du sub-project 02 : `tags: { include: { tag: true } }`).
type ProjectTagWithTag = Prisma.ProjectTagGetPayload<{ include: { tag: true } }>

type Props = {
  tags: ProjectTagWithTag[]
}

// Ordre fixe des groupes : EXPERTISE en tête (valeur métier), puis stack de la base
// applicative (LANGUAGE/FRAMEWORK/DATABASE) vers l'IA applicative puis INFRA.
const KIND_ORDER: TagKind[] = [
  'EXPERTISE',
  'LANGUAGE',
  'FRAMEWORK',
  'DATABASE',
  'AI',
  'INFRA',
]

export function TagStackGrouped({ tags }: Props) {
  const tCaseStudy = useTranslations('Projects.caseStudy')
  const tKind = useTranslations('Projects.caseStudy.kind')

  if (tags.length === 0) return null

  // Groupement par `tag.kind`. Le tableau en entrée est DÉJÀ trié par `displayOrder` ASC
  // côté query (cf. findPublishedBySlug sub-project 02), donc l'ordre relatif dans chaque
  // groupe est automatiquement conservé par `reduce` (pas de re-tri nécessaire).
  const grouped = tags.reduce<Partial<Record<TagKind, ProjectTagWithTag[]>>>((acc, projectTag) => {
    const kind = projectTag.tag.kind
    const list = acc[kind] ?? []
    list.push(projectTag)
    acc[kind] = list
    return acc
  }, {})

  return (
    <section className="my-12">
      <h2 className="text-2xl font-semibold mb-6">{tCaseStudy('stackTitle')}</h2>
      <div className="flex flex-col gap-6">
        {KIND_ORDER.filter((kind) => grouped[kind] && grouped[kind]!.length > 0).map((kind) => {
          const isExpertise = kind === 'EXPERTISE'
          return (
            <div key={kind}>
              <h3 className="text-sm font-medium uppercase tracking-wider text-muted-foreground mb-2">
                {tKind(kind)}
              </h3>
              <div className="flex flex-wrap gap-2">
                {grouped[kind]!.map((projectTag) => (
                  <TagBadge
                    key={projectTag.tag.slug}
                    tag={projectTag.tag}
                    className={isExpertise ? 'text-base px-3 py-1' : undefined}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
```

Notes :
- Le groupe `EXPERTISE` reçoit une classe `text-base px-3 py-1` sur chaque `TagBadge` (badge légèrement plus grand) pour souligner la valeur métier, sans introduire de composant dédié.
- Pas de re-tri côté composant : le tableau `tags` arrive déjà trié `displayOrder ASC` depuis la query Prisma (`include: { tags: { include: { tag: true }, orderBy: { displayOrder: 'asc' } } }`). `Array.reduce` parcourt dans l'ordre et préserve l'ordre relatif au sein de chaque groupe.
- Utilisation de `reduce` plutôt que `Object.groupBy` pour compatibilité garantie avec le target TypeScript projet.

- [ ] **Step 2: Vérifier compilation**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 6: Créer `CaseStudyMarkdown`

**Files:**
- Create: `src/components/features/projects/CaseStudyMarkdown.tsx`

- [ ] **Step 1: Créer le composant**

Créer `src/components/features/projects/CaseStudyMarkdown.tsx` avec ce contenu exact :

```typescript
import Image from 'next/image'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = {
  markdown: string
}

export function CaseStudyMarkdown({ markdown }: Props) {
  return (
    <section className="my-12">
      <article className="prose prose-lg dark:prose-invert max-w-none">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            img: ({ src, alt }) => {
              if (!src || typeof src !== 'string') return null
              return (
                <figure className="my-8">
                  <Image
                    src={src}
                    alt={alt ?? ''}
                    width={1600}
                    height={900}
                    sizes="(max-width: 768px) 100vw, 1200px"
                    className="rounded-lg shadow-md w-full h-auto"
                  />
                  {alt ? (
                    <figcaption className="text-sm text-center text-muted-foreground mt-2">
                      {alt}
                    </figcaption>
                  ) : null}
                </figure>
              )
            },
            a: ({ href, children }) => {
              const isExternal = typeof href === 'string' && href.startsWith('http')
              return (
                <a
                  href={href}
                  target={isExternal ? '_blank' : undefined}
                  rel={isExternal ? 'noopener noreferrer' : undefined}
                >
                  {children}
                </a>
              )
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </article>
    </section>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 7: Créer `CaseStudyHeader`

**Files:**
- Create: `src/components/features/projects/CaseStudyHeader.tsx`

- [ ] **Step 1: Créer le composant**

Créer `src/components/features/projects/CaseStudyHeader.tsx` avec ce contenu exact :

```typescript
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import type { LocalizedProjectWithRelations } from '@/types/project'
import { Badge } from '@/components/ui/badge'

type Props = {
  project: LocalizedProjectWithRelations
}

function formatYearRange(startedAt: Date | null, endedAt: Date | null, inProgressLabel: string): string {
  const start = startedAt ? new Date(startedAt).getFullYear() : null
  if (!start) return ''
  const end = endedAt ? new Date(endedAt).getFullYear() : null
  if (!end) return `${start} — ${inProgressLabel}`
  if (start === end) return `${start}`
  return `${start} — ${end}`
}

export function CaseStudyHeader({ project }: Props) {
  const t = useTranslations('Projects.caseStudy')
  const tContract = useTranslations('Projects.caseStudy.contractStatus')
  const tWorkMode = useTranslations('Projects.caseStudy.workMode')
  const tSector = useTranslations('Projects.caseStudy.sector')
  const tSize = useTranslations('Projects.caseStudy.companySize')
  const tLocation = useTranslations('Projects.caseStudy.companyLocation')
  const tFormats = useTranslations('Projects.formats')

  const duration = formatYearRange(project.startedAt, project.endedAt, t('inProgress'))
  const company = project.clientMeta?.company
  const teamSize = project.clientMeta?.teamSize
  const contract = project.clientMeta?.contractStatus
  const workMode = project.clientMeta?.workMode

  return (
    <header className="mb-12">
      {/* Cover image ou gradient */}
      <div className="relative w-full h-64 md:h-96 overflow-hidden rounded-xl mb-8">
        {project.coverFilename ? (
          <Image
            src={`/api/assets/${project.coverFilename}`}
            alt={project.title}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-primary/20 to-accent/20" />
        )}
      </div>

      {/* Titre */}
      <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{project.title}</h1>

      {/* Formats (badges outline sans icône) */}
      {project.formats.length > 0 ? (
        <div className="flex flex-wrap gap-2 mb-4">
          {project.formats.map((format) => (
            <Badge key={format} variant="outline" className="text-sm font-normal">
              {tFormats(format)}
            </Badge>
          ))}
        </div>
      ) : null}

      {/* Description lead */}
      <p className="text-lg md:text-xl text-muted-foreground mb-8">{project.description}</p>

      {/* Bloc Entreprise (si CLIENT) */}
      {company ? (
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8 p-4 rounded-lg bg-muted/30">
          {company.logoFilename ? (
            <Image
              src={`/api/assets/${company.logoFilename}`}
              alt={company.name}
              width={48}
              height={48}
              className="rounded object-contain"
            />
          ) : null}
          <div className="flex flex-col gap-1">
            {company.websiteUrl ? (
              <a
                href={company.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xl font-semibold hover:underline"
              >
                {company.name}
              </a>
            ) : (
              <span className="text-xl font-semibold">{company.name}</span>
            )}
            <div className="flex flex-wrap gap-x-3 text-sm text-muted-foreground">
              {company.sectors.length > 0 ? (
                <span>{company.sectors.map((s) => tSector(s)).join(' / ')}</span>
              ) : null}
              {company.size ? <span>{tSize(company.size)}</span> : null}
              {company.locations.length > 0 ? (
                <span>{company.locations.map((l) => tLocation(l)).join(' / ')}</span>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {/* Meta Mission (grille responsive) */}
      <dl className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        {teamSize ? (
          <div>
            <dt className="text-muted-foreground uppercase tracking-wider text-xs mb-1">
              {t('meta.teamSize')}
            </dt>
            <dd className="font-medium">{t('meta.teamSizeValue', { count: teamSize })}</dd>
          </div>
        ) : null}
        {contract ? (
          <div>
            <dt className="text-muted-foreground uppercase tracking-wider text-xs mb-1">
              {t('meta.contract')}
            </dt>
            <dd className="font-medium">{tContract(contract)}</dd>
          </div>
        ) : null}
        {workMode ? (
          <div>
            <dt className="text-muted-foreground uppercase tracking-wider text-xs mb-1">
              {t('meta.workMode')}
            </dt>
            <dd className="font-medium">{tWorkMode(workMode)}</dd>
          </div>
        ) : null}
        {duration ? (
          <div>
            <dt className="text-muted-foreground uppercase tracking-wider text-xs mb-1">
              {t('meta.duration')}
            </dt>
            <dd className="font-medium">{duration}</dd>
          </div>
        ) : null}
      </dl>
    </header>
  )
}
```

- [ ] **Step 2: Vérifier compilation**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 8: Créer `CaseStudyFooter`

**Files:**
- Create: `src/components/features/projects/CaseStudyFooter.tsx`

- [ ] **Step 1: Créer le composant**

Créer `src/components/features/projects/CaseStudyFooter.tsx` avec ce contenu exact :

```typescript
import { ArrowLeft, ExternalLink, Github } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Button } from '@/components/ui/button'
import type { LocalizedProjectWithRelations } from '@/types/project'

type Props = {
  project: LocalizedProjectWithRelations
}

export function CaseStudyFooter({ project }: Props) {
  const t = useTranslations('Projects.caseStudy')
  const hasLinks = Boolean(project.demoUrl || project.githubUrl)

  return (
    <footer className="mt-16 pt-8 border-t flex flex-col gap-6">
      {hasLinks ? (
        <div className="flex flex-wrap gap-3">
          {project.demoUrl ? (
            <Button asChild variant="default">
              <a href={project.demoUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('links.demo')}
              </a>
            </Button>
          ) : null}
          {project.githubUrl ? (
            <Button asChild variant="outline">
              <a href={project.githubUrl} target="_blank" rel="noopener noreferrer">
                <Github className="mr-2 h-4 w-4" />
                {t('links.github')}
              </a>
            </Button>
          ) : null}
        </div>
      ) : null}

      <Link
        href="/projets"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        {t('backToList')}
      </Link>
    </footer>
  )
}
```

- [ ] **Step 2: Vérifier `Button` shadcn existe**

Run:
```bash
ls src/components/ui/button.tsx 2>&1 || echo "MISSING"
```

Si MISSING :
```bash
pnpm dlx shadcn@latest add button
```

- [ ] **Step 3: Typecheck**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 9: Créer `CaseStudyLayout`

**Files:**
- Create: `src/components/features/projects/CaseStudyLayout.tsx`

- [ ] **Step 1: Créer le composant orchestrateur**

Créer `src/components/features/projects/CaseStudyLayout.tsx` avec ce contenu exact :

```typescript
import type { LocalizedProjectWithRelations } from '@/types/project'
import { CaseStudyHeader } from './CaseStudyHeader'
import { TagStackGrouped } from './TagStackGrouped'
import { CaseStudyMarkdown } from './CaseStudyMarkdown'
import { CaseStudyFooter } from './CaseStudyFooter'

type Props = {
  project: LocalizedProjectWithRelations
}

/**
 * Ordre de lecture intentionnel :
 *   Header (cover + meta) → Narration markdown → Stack & Expertises groupées (ordre fixe
 *   EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA, tri displayOrder asc
 *   dans chaque groupe) → Footer (liens + retour).
 * Chaque section s'auto-omet si son contenu est vide (markdown null, tags vide).
 */
export function CaseStudyLayout({ project }: Props) {
  return (
    <article className="container mx-auto px-4 py-12 sm:px-6 lg:px-8 lg:py-16 max-w-5xl">
      <CaseStudyHeader project={project} />
      {project.caseStudyMarkdown ? (
        <CaseStudyMarkdown markdown={project.caseStudyMarkdown} />
      ) : null}
      <TagStackGrouped tags={project.tags} />
      <CaseStudyFooter project={project} />
    </article>
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

### Task 10: Ajouter les clés i18n

**Files:**
- Modify: `messages/fr.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Ajouter la sous-clé `caseStudy` dans `messages/fr.json`**

Ouvrir `messages/fr.json` et **fusionner** le fragment ci-dessous dans la section `Projects` existante (créée au sub-project 05 qui contient déjà `metaTitle`, `metaDescription`, `pageTitle`, `pageSubtitle`, `filters`, `formats`, `inProgress`, `emptyState`, `cardAriaLabel`). Ajouter uniquement la nouvelle clé `caseStudy`, ne pas toucher les clés existantes.

Fragment à insérer (dernière clé de l'objet `Projects`, avant la `}` fermante) :

```json
    "caseStudy": {
      "stackTitle": "Stack & Expertises",
      "backToList": "Retour aux projets",
      "inProgress": "En cours",
      "meta": {
        "teamSize": "Équipe",
        "teamSizeValue": "{count, plural, one {# personne} other {# personnes}}",
        "contract": "Contrat",
        "workMode": "Mode",
        "duration": "Durée"
      },
      "contractStatus": {
        "FREELANCE": "Freelance",
        "CDI": "CDI",
        "STAGE": "Stage",
        "ALTERNANCE": "Alternance"
      },
      "workMode": {
        "PRESENTIEL": "Présentiel",
        "HYBRIDE": "Hybride",
        "REMOTE": "Remote"
      },
      "sector": {
        "ASSURANCE": "Assurance",
        "FINTECH": "Fintech",
        "SAAS": "SaaS",
        "SERVICES_RH": "Services RH",
        "ESN_CONSEIL": "ESN / Conseil",
        "LOGICIELS_ENTREPRISE": "Logiciels d'entreprise",
        "ECOMMERCE": "E-commerce",
        "IA_AUTOMATISATION": "IA / Automatisation",
        "EMARKETING": "E-marketing",
        "BANQUE": "Banque",
        "AUTRE": "Autre"
      },
      "companySize": {
        "TPE": "TPE (1-50)",
        "PME": "PME (50-250)",
        "ETI": "ETI (250-5000)",
        "GROUPE": "Groupe (5000+)"
      },
      "companyLocation": {
        "LUXEMBOURG": "Luxembourg",
        "PARIS": "Paris",
        "GRAND_EST": "Grand Est",
        "FRANCE": "France",
        "BELGIQUE": "Belgique",
        "SUISSE": "Suisse",
        "EUROPE": "Europe",
        "MONDE": "Monde"
      },
      "kind": {
        "EXPERTISE": "Expertises",
        "LANGUAGE": "Langages",
        "FRAMEWORK": "Frameworks",
        "DATABASE": "Bases de données",
        "AI": "IA",
        "INFRA": "Infrastructure"
      },
      "links": {
        "demo": "Voir la démo",
        "github": "Voir le code"
      }
    }
```

Penser à ajouter une virgule après la clé `cardAriaLabel` précédente avant d'ajouter ce fragment.

- [ ] **Step 2: Ajouter la sous-clé `caseStudy` dans `messages/en.json`**

Même procédure qu'à Step 1 (la clé `formats` est déjà présente via le sub-project 05), fragment EN à fusionner, ajouter uniquement `caseStudy` :

```json
    "caseStudy": {
      "stackTitle": "Stack & Expertise",
      "backToList": "Back to projects",
      "inProgress": "In progress",
      "meta": {
        "teamSize": "Team",
        "teamSizeValue": "{count, plural, one {# person} other {# people}}",
        "contract": "Contract",
        "workMode": "Mode",
        "duration": "Duration"
      },
      "contractStatus": {
        "FREELANCE": "Freelance",
        "CDI": "Permanent",
        "STAGE": "Internship",
        "ALTERNANCE": "Apprenticeship"
      },
      "workMode": {
        "PRESENTIEL": "On-site",
        "HYBRIDE": "Hybrid",
        "REMOTE": "Remote"
      },
      "sector": {
        "ASSURANCE": "Insurance",
        "FINTECH": "Fintech",
        "SAAS": "SaaS",
        "SERVICES_RH": "HR Services",
        "ESN_CONSEIL": "Consulting",
        "LOGICIELS_ENTREPRISE": "Enterprise Software",
        "ECOMMERCE": "E-commerce",
        "IA_AUTOMATISATION": "AI / Automation",
        "EMARKETING": "E-marketing",
        "BANQUE": "Banking",
        "AUTRE": "Other"
      },
      "companySize": {
        "TPE": "Small (1-50)",
        "PME": "Medium (50-250)",
        "ETI": "Mid-large (250-5000)",
        "GROUPE": "Enterprise (5000+)"
      },
      "companyLocation": {
        "LUXEMBOURG": "Luxembourg",
        "PARIS": "Paris",
        "GRAND_EST": "Grand Est",
        "FRANCE": "France",
        "BELGIQUE": "Belgium",
        "SUISSE": "Switzerland",
        "EUROPE": "Europe",
        "MONDE": "Worldwide"
      },
      "kind": {
        "EXPERTISE": "Expertise",
        "LANGUAGE": "Languages",
        "FRAMEWORK": "Frameworks",
        "DATABASE": "Databases",
        "AI": "AI",
        "INFRA": "Infrastructure"
      },
      "links": {
        "demo": "View demo",
        "github": "View code"
      }
    }
```

- [ ] **Step 3: Valider les JSON**

Run:
```bash
pnpm exec node -e "JSON.parse(require('fs').readFileSync('messages/fr.json','utf8')); JSON.parse(require('fs').readFileSync('messages/en.json','utf8')); console.log('✔ JSON valides')"
```
Expected : `✔ JSON valides`.

---

### Task 11: Écrire le test Vitest `generateStaticParams` (TDD)

**Files:**
- Create: `tests/integration/case-study-page.integration.test.ts`

- [ ] **Step 1: Créer le fichier de test**

Créer `tests/integration/case-study-page.integration.test.ts` avec ce contenu exact :

```typescript
// @vitest-environment node
import { beforeEach, describe, expect, it } from 'vitest'
import { prisma, resetDatabase } from './setup'
import { generateStaticParams } from '@/app/[locale]/(public)/projets/[slug]/page'

describe('generateStaticParams — case study', () => {
  beforeEach(async () => {
    await resetDatabase()
  })

  it('retourne uniquement les slugs status=PUBLISHED × 2 locales (exclut DRAFT et ARCHIVED)', async () => {
    await prisma.project.createMany({
      data: [
        { slug: 'pub', title: 'Published', description: 'd', type: 'PERSONAL', status: 'PUBLISHED' },
        { slug: 'draft', title: 'Draft', description: 'd', type: 'PERSONAL', status: 'DRAFT' },
        { slug: 'arch', title: 'Archived', description: 'd', type: 'PERSONAL', status: 'ARCHIVED' },
      ],
    })

    const params = await generateStaticParams()

    // 1 projet PUBLISHED × 2 locales = 2 entrées
    expect(params).toHaveLength(2)
    expect(params).toEqual(
      expect.arrayContaining([
        { locale: 'fr', slug: 'pub' },
        { locale: 'en', slug: 'pub' },
      ]),
    )

    // DRAFT et ARCHIVED doivent être absents
    const slugs = params.map((p) => p.slug)
    expect(slugs).not.toContain('draft')
    expect(slugs).not.toContain('arch')
  })
})
```

- [ ] **Step 2: Run le test: doit FAIL (page.tsx pas créé)**

Run:
```bash
pnpm vitest run case-study-page.integration
```
Expected : FAIL avec erreur d'import `Cannot find module '@/app/[locale]/(public)/projets/[slug]/page'`.

---

### Task 12: Créer la page `page.tsx`

Règles : [.claude/rules/nextjs/routing.md](../../../../.claude/rules/nextjs/routing.md), [.claude/rules/nextjs/rendering-caching.md](../../../../.claude/rules/nextjs/rendering-caching.md), [.claude/rules/nextjs/metadata-seo.md](../../../../.claude/rules/nextjs/metadata-seo.md), [.claude/rules/next-intl/setup.md](../../../../.claude/rules/next-intl/setup.md).

**Files:**
- Create: `src/app/[locale]/(public)/projets/[slug]/page.tsx`

- [ ] **Step 1: Créer le dossier et le fichier**

Run:
```bash
mkdir -p "src/app/[locale]/(public)/projets/[slug]"
```

Créer `src/app/[locale]/(public)/projets/[slug]/page.tsx` avec ce contenu exact :

```typescript
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import type { Metadata } from 'next'
import { routing } from '@/i18n/routing'
import { prisma } from '@/lib/prisma'
import { findPublishedBySlug } from '@/server/queries/projects'
import { CaseStudyLayout } from '@/components/features/projects/CaseStudyLayout'

type PageProps = {
  params: Promise<{ locale: string; slug: string }>
}

export async function generateStaticParams(): Promise<{ locale: string; slug: string }[]> {
  const projects = await prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true },
  })
  return routing.locales.flatMap((locale) =>
    projects.map(({ slug }) => ({ locale, slug })),
  )
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale, slug } = await params
  const project = await findPublishedBySlug(slug, locale)

  if (!project) {
    return { title: 'Not found' }
  }

  return {
    title: project.title,
    description: project.description,
    alternates: {
      languages: {
        fr: `/fr/projets/${slug}`,
        en: `/en/projets/${slug}`,
      },
    },
  }
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { locale, slug } = await params

  if (!hasLocale(routing.locales, locale)) {
    notFound()
  }

  setRequestLocale(locale)

  const project = await findPublishedBySlug(slug, locale)

  if (!project) {
    notFound()
  }

  return <CaseStudyLayout project={project} />
}
```

- [ ] **Step 2: Run le test: doit PASS**

Run:
```bash
pnpm vitest run case-study-page.integration
```
Expected : 1 test PASS.

Note : le mock `server-only` + l'alias `vitest.config.ts` mis en place au sub-project 02 Task 6 restent actifs ici, donc aucun workaround supplémentaire à appliquer.

- [ ] **Step 3: Typecheck global**

Run:
```bash
pnpm typecheck
```
Expected : 0 erreur.

---

### Task 13: Smoke test browser

**Files:** (validation live)

- [ ] **Step 1: S'assurer qu'au moins 1 projet a du contenu visuel complet**

Run:
```bash
docker compose exec postgres psql -U portfolio -d portfolio -c "SELECT slug FROM \"Project\" WHERE status='PUBLISHED' AND \"caseStudyMarkdown\" IS NOT NULL LIMIT 1;"
```
Expected : au moins 1 slug retourné. Si 0 : aller remplir `caseStudyMarkdown` dans `seed-data/projects.ts` + `just seed`.

- [ ] **Step 2: Démarrer le dev server**

Run:
```bash
just dev &
```
Attendre ~5s (port 3000).

- [ ] **Step 3: Accéder à la page case study en FR**

Ouvrir http://localhost:3000/fr/projets/<slug> (slug du Step 1) dans le navigateur.

Vérifier visuellement :
- Cover image affichée en grand (ou gradient fallback si null)
- Titre H1 et description en lead
- Meta structurées (entreprise CLIENT + équipe + contrat + durée)
- Contenu markdown rendu avec prose (titres, paragraphes, listes, images inline avec légendes), lu depuis le fichier `.md` correspondant au type dans `prisma/seed-data/case-studies/`
- Section "Stack & Expertises" groupée par kind dans l'ordre fixe EXPERTISE (en tête, badges légèrement plus grands) → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA, chaque groupe listant ses tags dans l'ordre `ProjectTag.displayOrder` asc (pas alphabétique)
- Footer avec boutons Démo + GitHub (si URLs présentes) et lien "← Retour aux projets"

- [ ] **Step 4: Vérifier 404 sur slug absent**

Run :
```bash
curl -sI http://localhost:3000/fr/projets/slug-totalement-absent | head -1
```
Expected : `HTTP/1.1 404 Not Found`.

- [ ] **Step 5: Vérifier 404 sur slug DRAFT**

Run :
```bash
docker compose exec postgres psql -U portfolio -d portfolio -c "SELECT slug FROM \"Project\" WHERE status='DRAFT' LIMIT 1;"
```

Si slug DRAFT retourné, tester :
```bash
curl -sI http://localhost:3000/fr/projets/<slug-draft> | head -1
```
Expected : `HTTP/1.1 404 Not Found`.

- [ ] **Step 6: Vérifier la version EN**

Ouvrir http://localhost:3000/en/projets/<slug>, titres/labels traduits en anglais.

- [ ] **Step 7: Inspect metadata HTML + hreflang**

Run :
```bash
curl -s http://localhost:3000/fr/projets/<slug> | grep -E "(<title>|<meta name=\"description\"|hreflang)"
```
Expected : `<title>` avec le titre du projet, `<meta name="description">` avec la description, `<link rel="alternate" hreflang="fr" ...>`, `<link rel="alternate" hreflang="en" ...>`.

- [ ] **Step 8: Vérifier que `pnpm build` pré-génère les slugs PUBLISHED**

Run:
```bash
just stop 2>/dev/null || true
just build 2>&1 | tail -50
```
Expected : output contient `/fr/projets/<slug>` et `/en/projets/<slug>` dans la liste des pages statiques générées. Pas d'erreur.

---

### Task 14: Qualité + commit

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

- [ ] **Step 3: Tests**

Run:
```bash
just test
```
Expected : tous les tests passent incluant le nouveau test `case-study-page.integration.test.ts`.

- [ ] **Step 4: Commit**

Run:
```bash
git add package.json pnpm-lock.yaml src/app/globals.css src/components/features/projects/ src/app/\[locale\]/\(public\)/projets/\[slug\]/ messages/fr.json messages/en.json tests/integration/case-study-page.integration.test.ts
git commit -m "$(cat <<'EOF'
feat(projets): page case study /projets/[slug] avec generateStaticParams + markdown

- src/app/[locale]/(public)/projets/[slug]/page.tsx : Server Component + generateStaticParams (slugs PUBLISHED × 2 locales) + generateMetadata localisé
- src/components/features/projects/CaseStudyLayout.tsx : orchestration sections (header → markdown → TagStackGrouped → footer)
- src/components/features/projects/CaseStudyHeader.tsx : cover + title + meta structurées (entreprise/équipe/contrat/durée)
- src/components/features/projects/TagStackGrouped.tsx : tous les tags groupés par TagKind dans l'ordre fixe EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA, tri ProjectTag.displayOrder asc dans chaque groupe (pas alphabétique), badges EXPERTISE légèrement plus grands
- src/components/features/projects/CaseStudyMarkdown.tsx : react-markdown + remark-gfm + Image wrapper custom (légendes depuis alt)
- src/components/features/projects/CaseStudyFooter.tsx : boutons démo/GitHub + retour liste
- react-markdown + remark-gfm + @tailwindcss/typography installés
- @plugin @tailwindcss/typography dans globals.css (Tailwind 4)
- messages/*.json : section Projects.caseStudy.* (incl. kind.EXPERTISE)
- 1 test Vitest sur generateStaticParams

Spec: docs/superpowers/specs/projets/06-page-case-study-design.md
EOF
)"
```

- [ ] **Step 5: Vérifier le commit**

Run:
```bash
git log -1 --stat
```
Expected : commit listant les fichiers attendus.

---

## Self-Review

**1. Spec coverage** :
- ✅ `Scope` page + composants + deps + i18n + test → Tasks 4-12
- ✅ `État livré` navigateur /fr /en, 404, build → Task 13 smoke tests
- ✅ `Dependencies` 01/02/03/05 → Task 1 prérequis
- ✅ `Files touched` tous mappés :
  - page.tsx (T12), CaseStudyLayout (T9), CaseStudyHeader (T7), TagStackGrouped (Task 4+5 fusionnée), CaseStudyMarkdown (T6), CaseStudyFooter (T8)
  - test case-study-page.integration.test.ts (T11)
  - messages/fr.json + en.json (T10)
  - package.json + globals.css (T2 + T3)
- ✅ `Architecture approach` :
  - Server Component page avec setRequestLocale + hasLocale + findPublishedBySlug + notFound → T12 ✓
  - generateStaticParams × routing.locales → T12 ✓
  - generateMetadata avec alternates → T12 ✓
  - TagStackGrouped groupe TOUS les tags (incl. EXPERTISE) par TagKind dans l'ordre fixe EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA, tri `displayOrder asc` dans chaque groupe (pas alphabétique), skip kind vide, badges EXPERTISE légèrement plus grands → Task 4+5 ✓
  - CaseStudyMarkdown avec react-markdown + remark-gfm + Image wrapper + figcaption depuis alt → T6 ✓
  - CaseStudyHeader cover + meta structurées conditionnelles → T7 ✓
  - CaseStudyFooter liens conditionnels + retour → T8 ✓
  - CaseStudyLayout orchestre header → markdown → TagStackGrouped → footer, chaque section auto-omise → T9 ✓
- ✅ `Acceptance criteria` :
  - Scénario 1 (pré-génération SEO) → T13 step 8 (just build)
  - Scénario 2 (rendu contenu riche avec stack groupé) → T13 step 3
  - Scénario 3 (sans markdown) → CaseStudyLayout T9 (conditionnel)
  - Scénario 4 (404 slug inexistant) → T13 step 4
  - Scénario 5 (404 DRAFT) → T13 step 5
  - Scénario 6 (metadata localisée) → T13 step 7
  - Scénario 7 (stack groupé par kind dans l'ordre fixe, tri displayOrder) → T13 step 3 (inspection visuelle)
  - Scénario 8 (projet sans expertises) → TagStackGrouped (Task 4+5) skip le groupe EXPERTISE vide
- ✅ `Tests à écrire` : 1 test Vitest `generateStaticParams` → T11 + T12 step 2
- ✅ `Edge cases` couverts :
  - Cover null → gradient fallback T7 ✓
  - Pas de clientMeta → affichage conditionnel T7 ✓
  - endedAt null → "En cours" via formatYearRange T7 ✓
  - Markdown vide → section omise T9 ✓
  - Image cassée → alt fallback navigateur T6 ✓
  - Projet sans tags → TagStackGrouped early return null (Task 4+5) ✓
  - Aucune expertise → groupe EXPERTISE skip silencieusement (Task 4+5) ✓
  - Aucun tag non-EXPERTISE → seuls les autres groupes sont skippés (Task 4+5) ✓
  - Slug spéciaux → string comparison T12 ✓
  - Locale invalide → hasLocale + notFound T12 ✓
- ✅ `Architectural decisions` appliquées : markdown String libre en BDD (T7 utilise project.caseStudyMarkdown, rempli par le seed sub-project 03 depuis `.md` séparés), composant unique TagStackGrouped avec 6 groupes dans l'ordre fixe `EXPERTISE → LANGUAGE → FRAMEWORK → DATABASE → AI → INFRA` et tri `ProjectTag.displayOrder` asc dans chaque groupe (Task 4+5), react-markdown + typography (T2 + T6), generateStaticParams × locales (T12), pas de prev/next (absence dans T8).

**2. Placeholder scan** : aucun TBD/TODO. Exception conditionnelle documentée (T8 step 2 installe Button si absent via shadcn CLI). Le mock `server-only` est hérité du sub-project 02 Task 6, pas un workaround conditionnel dans ce plan.

**3. Type consistency** :
- `LocalizedProjectWithRelations` (sub-project 02) : importé T7/T8/T9/T12, cohérent partout. Les tags y sont un array de `ProjectTag` incluant la relation `tag` (via `include: { tags: { include: { tag: true } } }`), déjà trié `displayOrder asc` côté query.
- `TagKind` : importé Task 4+5 depuis Prisma client, énuméré dans `KIND_ORDER` dans l'ordre spec'é `[EXPERTISE, LANGUAGE, FRAMEWORK, DATABASE, AI, INFRA]`.
- `ProjectTagWithTag` : type local dans TagStackGrouped (Task 4+5), dérivé via `Prisma.ProjectTagGetPayload<{ include: { tag: true } }>`, correspond exactement au shape retourné par `findPublishedBySlug`.
- `findPublishedBySlug` : signature défendue sub-project 02, appelée T12 (generateMetadata + page)
- `generateStaticParams` : signature `() => Promise<{ locale: string; slug: string }[]>` cohérente T11 test + T12 impl
- Clés i18n : `Projects.caseStudy.stackTitle`, `.backToList`, `.inProgress`, `.meta.*`, `.contractStatus.*`, `.kind.*` (incl. `EXPERTISE`), `.links.*`, définies T10, utilisées Task 4+5/T6/T7/T8. Plus de clé `expertiseTitle` (fusionnée dans `kind.EXPERTISE`).
- `TagBadge` : réutilisé Task 4+5 depuis sub-project 05 (pas redéfini).

---

## Prochaine étape

Après exécution de ce plan : la Feature 2, Projets est fonctionnellement complète (visiteur navigue de `/projets` vers `/projets/[slug]`, SEO pré-généré, i18n FR/EN). Pour lancer l'implémentation de ce plan : `/implement-subproject projets 06`.
