# Sitemap dynamique avec slugs projets et hreflang FR/EN: Plan d'implémentation (sub-project 03 / Feature 5 SEO)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec source :** [docs/superpowers/specs/seo-referencement/03-sitemap-dynamique-design.md](../../specs/seo-referencement/03-sitemap-dynamique-design.md)

**Goal :** Étendre `/sitemap.xml` pour inclure tous les projets `PUBLISHED` (canonical FR + alternates hreflang FR/EN/x-default + lastmod issu d'`updatedAt`) en plus des 5 pages statiques déjà couvertes, avec invalidation atomique via `cacheTag('projects')`.

**Architecture :** Trois unités séparées par responsabilité, (1) query Prisma allégée `findAllPublishedSlugs()` ajoutée dans `src/server/queries/projects.ts` (mêmes params cache que les fonctions sœurs), (2) helper pur `buildSitemapEntries()` colocalisé dans `src/lib/sitemap.ts` + tests unitaires, (3) route handler `src/app/sitemap.ts` réécrit en fichier mince qui orchestre query + helper.

**Tech Stack :** Next.js 16.2.4 App Router · TypeScript 6 strict · Prisma 7.7.0 · next-intl 4.9.1 (`localePrefix: 'always'`, FR/EN) · Vitest 4 (project unit jsdom).

**Rules à respecter (lecture dynamique) :**
- `.claude/rules/nextjs/metadata-seo.md` (cœur : convention `app/sitemap.ts`, `MetadataRoute.Sitemap`)
- `.claude/rules/nextjs/data-fetching.md` (queries Prisma + cache scope)
- `.claude/rules/nextjs/rendering-caching.md` (`'use cache'`, `cacheLife`, `cacheTag`, `revalidateTag`)
- `.claude/rules/nextjs/routing.md`
- `.claude/rules/prisma/client-setup.md` (singleton `prisma`, `'server-only'`)
- `.claude/rules/prisma/schema-migrations.md`
- `.claude/rules/typescript/conventions.md`
- `.claude/rules/vitest/setup.md` (project unit jsdom, no-lib-test)
- `.claude/rules/nextjs/tests.md`

**ADRs liés :** ADR-001 (monolithe Next.js), ADR-006 (hub de démos, sitemap n'inclut pas les domaines externes), ADR-010 (i18n FR/EN, hreflang via alternates).

**Politique commits :** Pas de commit en cours de plan. La séquence complète est validée puis le user déclenche un commit unique en fin de workflow d'implémentation (cf. `~/.claude/CLAUDE.md` § Discipline commit).

---

## File Structure

| Fichier | Action | Rôle |
|---|---|---|
| `src/lib/sitemap.ts` | Créer | Helper pur `buildSitemapEntries({ staticPaths, projects, siteUrl })` + constante exportée `PUBLIC_STATIC_PATHS`. Pas de side effect, pas d'accès Prisma, testable en isolation. |
| `src/lib/sitemap.test.ts` | Créer | Tests unitaires Vitest project unit (jsdom). 11 cas couvrant statiques, projets, composition, edge cases. |
| `src/server/queries/projects.ts` | Modifier | Ajouter `findAllPublishedSlugs()` à côté de `findManyPublished` et `findPublishedBySlug`. Aucune modification des fonctions existantes. |
| `src/app/sitemap.ts` | Réécrire (de ~25 à ~15 lignes) | Conserver `'use cache'` + `cacheLife('days')`, ajouter `cacheTag('projects')`, orchestrer `findAllPublishedSlugs()` + `buildSitemapEntries()`. Retirer `localizedEntry` interne et `publicPaths` (migrés dans `src/lib/sitemap.ts`). Retirer le TODO de la Feature 2 Projets (câblée maintenant). |

**Non touchés** : `src/lib/seo.ts` (sub-project 01 inchangé, on consomme `siteUrl` et `buildLanguageAlternates` tels quels), `next.config.ts`, `messages/{fr,en}.json`, `prisma/schema.prisma`, `package.json`, `src/i18n/*`.

---

## Task 1 : Tests rouges du helper `buildSitemapEntries`

**Files :**
- Create: `src/lib/sitemap.test.ts`

> Stratégie TDD : écrire les 11 tests d'un coup, les voir tous échouer parce que le module n'existe pas, puis implémenter dans Task 2.

- [ ] **Step 1 : Créer le fichier `src/lib/sitemap.test.ts`**

```typescript
import { describe, expect, it } from 'vitest'

import { buildSitemapEntries, PUBLIC_STATIC_PATHS } from './sitemap'

const SITE_URL_FIXTURE = 'https://thibaud-geisler.com'

function buildProject(overrides?: { slug?: string; updatedAt?: Date }) {
  return {
    slug: overrides?.slug ?? 'sample',
    updatedAt: overrides?.updatedAt ?? new Date('2026-01-01T00:00:00Z'),
  }
}

describe('PUBLIC_STATIC_PATHS', () => {
  it('expose les 5 paths publics du portfolio', () => {
    expect(PUBLIC_STATIC_PATHS).toEqual([
      '',
      '/services',
      '/projets',
      '/a-propos',
      '/contact',
    ])
  })
})

describe('buildSitemapEntries', () => {
  it('génère une entrée par chemin statique (5 paths → 5 entrées)', () => {
    const entries = buildSitemapEntries({
      staticPaths: PUBLIC_STATIC_PATHS,
      projects: [],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries).toHaveLength(5)
  })

  it('canonical statique = siteUrl + /<defaultLocale> + path', () => {
    const entries = buildSitemapEntries({
      staticPaths: ['/services'],
      projects: [],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr/services')
  })

  it('home (path vide) produit siteUrl/<defaultLocale> sans slash trailing', () => {
    const entries = buildSitemapEntries({
      staticPaths: [''],
      projects: [],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr')
  })

  it('alternates statiques exposent fr, en et x-default', () => {
    const entries = buildSitemapEntries({
      staticPaths: ['/services'],
      projects: [],
      siteUrl: SITE_URL_FIXTURE,
    })
    const langs = entries[0]?.alternates?.languages
    expect(langs).toBeDefined()
    expect(langs).toMatchObject({
      fr: 'https://thibaud-geisler.com/fr/services',
      en: 'https://thibaud-geisler.com/en/services',
      'x-default': 'https://thibaud-geisler.com/fr/services',
    })
  })

  it('génère une entrée par projet publié au format /projets/<slug>', () => {
    const entries = buildSitemapEntries({
      staticPaths: [],
      projects: [
        buildProject({ slug: 'webapp-gestion-sinistres' }),
        buildProject({ slug: 'foyer' }),
      ],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries).toHaveLength(2)
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres')
    expect(entries[1]?.url).toBe('https://thibaud-geisler.com/fr/projets/foyer')
  })

  it('lastModified projet = updatedAt (pas new Date())', () => {
    const updatedAt = new Date('2026-03-15T10:00:00Z')
    const entries = buildSitemapEntries({
      staticPaths: [],
      projects: [buildProject({ updatedAt })],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries[0]?.lastModified).toBe(updatedAt)
  })

  it('alternates projets exposent fr, en et x-default pointant vers /projets/<slug>', () => {
    const entries = buildSitemapEntries({
      staticPaths: [],
      projects: [buildProject({ slug: 'webapp-gestion-sinistres' })],
      siteUrl: SITE_URL_FIXTURE,
    })
    const langs = entries[0]?.alternates?.languages
    expect(langs).toMatchObject({
      fr: 'https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres',
      en: 'https://thibaud-geisler.com/en/projets/webapp-gestion-sinistres',
      'x-default': 'https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres',
    })
  })

  it('composition : 5 statiques + 3 projets → 8 entrées', () => {
    const entries = buildSitemapEntries({
      staticPaths: PUBLIC_STATIC_PATHS,
      projects: [
        buildProject({ slug: 'a' }),
        buildProject({ slug: 'b' }),
        buildProject({ slug: 'c' }),
      ],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries).toHaveLength(8)
  })

  it('ordre : statiques d\'abord, projets ensuite', () => {
    const entries = buildSitemapEntries({
      staticPaths: ['/services'],
      projects: [buildProject({ slug: 'webapp-gestion-sinistres' })],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr/services')
    expect(entries[1]?.url).toBe('https://thibaud-geisler.com/fr/projets/webapp-gestion-sinistres')
  })

  it('aucun projet : retourne uniquement les entrées statiques', () => {
    const entries = buildSitemapEntries({
      staticPaths: PUBLIC_STATIC_PATHS,
      projects: [],
      siteUrl: SITE_URL_FIXTURE,
    })
    expect(entries).toHaveLength(5)
  })

  it('siteUrl avec trailing slash : ne produit pas de double slash', () => {
    const entries = buildSitemapEntries({
      staticPaths: ['/services'],
      projects: [],
      siteUrl: 'https://thibaud-geisler.com/',
    })
    expect(entries[0]?.url).toBe('https://thibaud-geisler.com/fr/services')
    expect(entries[0]?.url).not.toContain('//fr')
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent (red)**

Run : `pnpm vitest run --project unit src/lib/sitemap.test.ts`
Expected : FAIL avec `Cannot find module './sitemap'` (ou erreur d'import similaire). Tous les tests sont concernés.

---

## Task 2 : Implémenter le helper `buildSitemapEntries` + constante `PUBLIC_STATIC_PATHS`

**Files :**
- Create: `src/lib/sitemap.ts`

- [ ] **Step 1 : Créer le fichier `src/lib/sitemap.ts`**

```typescript
import type { MetadataRoute } from 'next'

import { routing } from '@/i18n/routing'
import { buildLanguageAlternates } from '@/lib/seo'

export const PUBLIC_STATIC_PATHS = [
  '',
  '/services',
  '/projets',
  '/a-propos',
  '/contact',
] as const

type SitemapProject = {
  slug: string
  updatedAt: Date
}

type BuildSitemapEntriesInput = {
  staticPaths: readonly string[]
  projects: readonly SitemapProject[]
  siteUrl: string
}

export function buildSitemapEntries({
  staticPaths,
  projects,
  siteUrl,
}: BuildSitemapEntriesInput): MetadataRoute.Sitemap {
  const base = siteUrl.replace(/\/$/, '')
  const now = new Date()

  const staticEntries: MetadataRoute.Sitemap = staticPaths.map((path) => ({
    url: `${base}/${routing.defaultLocale}${path}`,
    lastModified: now,
    alternates: { languages: buildLanguageAlternates(path, base) },
  }))

  const projectEntries: MetadataRoute.Sitemap = projects.map((project) => {
    const path = `/projets/${project.slug}`
    return {
      url: `${base}/${routing.defaultLocale}${path}`,
      lastModified: project.updatedAt,
      alternates: { languages: buildLanguageAlternates(path, base) },
    }
  })

  return [...staticEntries, ...projectEntries]
}
```

> **Notes** :
> - `siteUrl.replace(/\/$/, '')` normalise le trailing slash pour le test `siteUrl avec trailing slash`.
> - `routing.defaultLocale` est `'fr'` (cf. `src/i18n/routing.ts`).
> - `buildLanguageAlternates(path, base)` est l'helper existant du sub-project 01 dans `src/lib/seo.ts`. Il produit `{ fr, en, 'x-default' }`.
> - Pas d'import `'server-only'` : ce module est pur, sans accès Prisma ni autre dépendance serveur.

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils passent (green)**

Run : `pnpm vitest run --project unit src/lib/sitemap.test.ts`
Expected : PASS (12 tests : 1 sur `PUBLIC_STATIC_PATHS` + 11 sur `buildSitemapEntries`).

- [ ] **Step 3 : Quality gate intermédiaire**

Run : `pnpm typecheck`
Expected : 0 erreur. Vérifier en particulier que le retour est compatible `MetadataRoute.Sitemap`.

---

## Task 3 : Ajouter la query Prisma allégée `findAllPublishedSlugs()`

**Files :**
- Modify: `src/server/queries/projects.ts` (ajouter à la fin du fichier, après `findPublishedBySlug`)

- [ ] **Step 1 : Ajouter la fonction `findAllPublishedSlugs()` à la fin du fichier**

Append après la fonction `findPublishedBySlug` :

```typescript
export async function findAllPublishedSlugs(): Promise<
  { slug: string; updatedAt: Date }[]
> {
  'use cache'
  cacheLife('hours')
  cacheTag('projects')
  return prisma.project.findMany({
    where: { status: 'PUBLISHED' },
    select: { slug: true, updatedAt: true },
    orderBy: { displayOrder: 'asc' },
  })
}
```

> **Notes** :
> - Mêmes paramètres de cache que `findManyPublished` et `findPublishedBySlug` (`cacheLife('hours')` + `cacheTag('projects')`) → invalidation atomique via un seul `revalidateTag('projects')`.
> - Pas d'argument `locale` : les slugs sont mono-valeur dans le modèle Prisma `Project` (cf. `prisma/schema.prisma:84-107`).
> - `select` minimal pour éviter le payload riche `LocalizedProjectWithRelations`.
> - `'server-only'` est déjà importé en haut du fichier (ligne 1), n'a pas besoin d'être ajouté.

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 4 : Réécrire `src/app/sitemap.ts` (orchestration mince)

**Files :**
- Modify: `src/app/sitemap.ts` (réécriture complète)

- [ ] **Step 1 : Remplacer entièrement le contenu de `src/app/sitemap.ts`**

```typescript
import type { MetadataRoute } from 'next'
import { cacheLife, cacheTag } from 'next/cache'

import { siteUrl } from '@/lib/seo'
import { buildSitemapEntries, PUBLIC_STATIC_PATHS } from '@/lib/sitemap'
import { findAllPublishedSlugs } from '@/server/queries/projects'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  'use cache'
  cacheLife('days')
  cacheTag('projects')

  const projects = await findAllPublishedSlugs()
  return buildSitemapEntries({
    staticPaths: PUBLIC_STATIC_PATHS,
    projects,
    siteUrl,
  })
}
```

> **Différences vs l'existant** :
> - Suppression de la fonction interne `localizedEntry` (logique migrée dans `buildSitemapEntries`)
> - Suppression de la constante `publicPaths` (migrée dans `PUBLIC_STATIC_PATHS` côté `src/lib/sitemap.ts`)
> - Suppression du TODO sur la Feature 2 Projets (maintenant câblée)
> - Ajout de `cacheTag('projects')` au scope du sitemap (mutualisation avec les autres queries projets)
> - Ajout de l'appel `findAllPublishedSlugs()` qui injecte les projets publiés
> - Conservation de `'use cache'` + `cacheLife('days')` (pages statiques bougent rarement, expiration longue acceptable, l'invalidation par `revalidateTag('projects')` couvre les changements de projets)

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur. Vérifier que le retour `Promise<MetadataRoute.Sitemap>` reste typé correctement.

---

## Task 5 : Quality gates statiques (lint + typecheck + tests)

**Files :** aucun, lancement des outils.

- [ ] **Step 1 : Lint**

Run : `pnpm lint` (ou `just lint`)
Expected : 0 erreur, 0 warning bloquant. Pas de violation des règles ESLint sur les nouveaux fichiers.

- [ ] **Step 2 : Typecheck complet**

Run : `just typecheck` (lance `pnpm next typegen && pnpm typecheck`)
Expected : 0 erreur. Vérifier que `MetadataRoute.Sitemap`, `BuildSitemapEntriesInput`, et le retour de `findAllPublishedSlugs()` sont tous correctement typés.

- [ ] **Step 3 : Tests unit complets**

Run : `just test-unit` (`pnpm vitest run --project unit --passWithNoTests`)
Expected : tous les tests unit passent, dont les ~12 cas de `src/lib/sitemap.test.ts`. Aucun test du sub-project 01 (`src/lib/seo.test.ts`) ne régresse.

- [ ] **Step 4 : Tests integration (sanity check, pas de régression)**

Run : `just test-integration`
Expected : suites integration vertes. Le sub-project 03 ne touche pas aux Server Actions ni aux endpoints API mais on confirme qu'aucun import collatéral ne casse.

- [ ] **Step 5 : Build standalone**

Run : `pnpm build`
Expected : build complet sans erreur. Vérifier que `next build` liste `/sitemap.xml` comme route statique ou dynamique sans avertissement.

---

## Task 6 : Validation manuelle end-to-end (5 scénarios spec)

**Files :** aucun, vérification HTTP.

> **Pré-requis** : `docker compose up -d --wait postgres`, `.env` rempli (`NEXT_PUBLIC_SITE_URL=http://localhost:3000` en local), au moins 1 projet `PUBLISHED` en base.

- [ ] **Step 1 : Compter les projets publiés en base**

Run : `pnpm tsx -e "import { prisma } from './src/lib/prisma'; const count = await prisma.project.count({ where: { status: 'PUBLISHED' } }); console.log('PUBLISHED projects:', count); await prisma.\$disconnect();"`
Expected : un nombre N s'affiche (ex : `PUBLISHED projects: 3`). Noter ce nombre, on l'utilisera ensuite.

- [ ] **Step 2 : Build prod local**

Run : `pnpm build && pnpm start`
Expected : `next start` écoute sur `http://localhost:3000`. `NODE_ENV` = `production` automatique.

- [ ] **Step 3 : Scénario 1 spec: XML structurel valide**

Run : `curl -s http://localhost:3000/sitemap.xml | xmllint --noout -`
Expected : exit code 0 (XML valide, pas d'output d'erreur).

Run : `curl -sI http://localhost:3000/sitemap.xml | grep -E '^(HTTP|Content-Type)'`
Expected : `HTTP/1.1 200 OK` + `Content-Type: application/xml` (ou `text/xml`).

- [ ] **Step 4 : Compter les entries**

Run : `curl -s http://localhost:3000/sitemap.xml | grep -c '<url>'`
Expected : `5 + N` (où N = nombre relevé au Step 1). Exemple : si `PUBLISHED projects: 3`, le résultat est `8`.

- [ ] **Step 5 : Scénario 2 spec: page statique avec hreflang**

Run : `curl -s http://localhost:3000/sitemap.xml | grep -A 6 'fr/services'`
Expected : extrait montrant l'entrée `/fr/services` avec :
- `<loc>http://localhost:3000/fr/services</loc>`
- `<lastmod>...</lastmod>` (date ISO 8601)
- 3 lignes `<xhtml:link rel="alternate" hreflang="...">` pour `fr`, `en`, `x-default`

- [ ] **Step 6 : Scénario 3 spec: page projet avec lastmod issu d'updatedAt**

Identifier un slug de projet PUBLISHED (déjà connu via les tests des sub-projects précédents, ex : un slug seedé).

Run : `curl -s http://localhost:3000/sitemap.xml | grep -A 6 'fr/projets/<slug-relevé>'`
Expected : entrée avec `<loc>http://localhost:3000/fr/projets/<slug-relevé></loc>`, `<lastmod>` correspondant à `updatedAt` du projet (vérifiable via `pnpm tsx`), et les 3 alternates hreflang.

- [ ] **Step 7 : Scénario 4 spec: projet non publié exclu**

Run : `pnpm tsx -e "import { prisma } from './src/lib/prisma'; const draft = await prisma.project.findFirst({ where: { status: 'DRAFT' }, select: { slug: true } }); console.log('DRAFT slug:', draft?.slug ?? 'none'); await prisma.\$disconnect();"`

Si un slug DRAFT s'affiche, vérifier qu'il **n'apparaît pas** dans le sitemap :

Run : `curl -s http://localhost:3000/sitemap.xml | grep -c '<slug-draft-relevé>'`
Expected : `0` (slug absent du sitemap).

Si aucun projet DRAFT n'existe, créer en temporairement un via Prisma Studio ou skip ce step (couvert par le test unit "ordre" et la query `where: { status: 'PUBLISHED' }` qui filtre déjà).

- [ ] **Step 8 : Scénario 5 spec: invalidation par cacheTag (optionnel pour MVP)**

> **Note** : ce scénario teste le mécanisme d'invalidation. Il sera vraiment exercé en prod par le dashboard admin post-MVP qui appellera `revalidateTag('projects')` après chaque mutation. En MVP, on se contente de vérifier que le mécanisme est branché (présence de `cacheTag('projects')` dans `src/app/sitemap.ts`).

Run : `grep -c "cacheTag\\(\\'projects\\'\\)" src/app/sitemap.ts`
Expected : `1` (le tag est bien déclaré).

(Test runtime de `revalidateTag('projects')` non exécuté en MVP : le mécanisme est validé indirectement par les autres queries qui utilisent le même tag. Une Server Action de test temporaire pourrait être ajoutée plus tard si besoin.)

- [ ] **Step 9 : Stopper le serveur prod**

Run : `just stop`.

---

## Self-review (post-écriture, fait par l'auteur du plan)

1. **Couverture spec** :
   - Helper pur `buildSitemapEntries` testable → Tasks 1-2 ✅ (12 tests Vitest)
   - Constante exportée `PUBLIC_STATIC_PATHS` → Task 2 ✅
   - Query Prisma allégée `findAllPublishedSlugs()` avec `'use cache'` + `cacheLife('hours')` + `cacheTag('projects')` → Task 3 ✅
   - Route handler `src/app/sitemap.ts` réécrit (mince, orchestration) → Task 4 ✅
   - `cacheTag('projects')` ajouté au sitemap → Task 4 Step 1 ✅
   - 5 scénarios Acceptance criteria → Task 6 (Steps 3-8) ✅
   - Edge cases (siteUrl trailing slash, 0 projet) → Task 1 (tests "Aucun projet" et "siteUrl avec trailing slash") ✅
   - Pas de modification de `src/lib/seo.ts` → respecté (réutilisation read-only de `siteUrl` et `buildLanguageAlternates`) ✅
   - Pas de tests sur `findAllPublishedSlugs()` ni sur le route handler (no-lib-test) → respecté (Task 5 lance les tests existants pour non-régression, aucun nouveau fichier `.test.ts` créé pour ces surfaces) ✅
   - 2 décisions architecturales tracées dans le spec (query allégée + helper séparé) → reflétées dans Task 2 (séparation `src/lib/sitemap.ts`) et Task 3 (`findAllPublishedSlugs` allégée) ✅

2. **Placeholder scan** :
   - Aucun `TBD` / `TODO` / `à compléter` dans les snippets de code (le TODO existant dans `src/app/sitemap.ts` est explicitement supprimé en Task 4).
   - Toutes les commandes `pnpm` / `just` / `curl` / `xmllint` sont exactes et reproductibles.
   - Le slug projet utilisé pour les tests est explicitement à relever via `pnpm tsx` (Task 6 Step 1 et Step 6), pas hardcodé dans le plan.
   - Aucun "similar to Task N" : chaque task contient son code complet.

3. **Type consistency** :
   - `SitemapProject` (Task 2) = `{ slug: string; updatedAt: Date }` ↔ retour de `findAllPublishedSlugs()` (Task 3) = `{ slug: string; updatedAt: Date }[]` → cohérent.
   - `BuildSitemapEntriesInput` (Task 2) consommé tel quel dans `src/app/sitemap.ts` (Task 4) avec les 3 propriétés `staticPaths`, `projects`, `siteUrl`.
   - `MetadataRoute.Sitemap` (type Next.js) utilisé en retour de `buildSitemapEntries` (Task 2) et de `sitemap()` (Task 4), cohérent.
   - `PUBLIC_STATIC_PATHS` exporté en Task 2, importé en Task 4.
   - `siteUrl` et `buildLanguageAlternates` réutilisés depuis `src/lib/seo.ts` (sub-project 01), signatures vérifiées dans Task 2.

Plan complet.
