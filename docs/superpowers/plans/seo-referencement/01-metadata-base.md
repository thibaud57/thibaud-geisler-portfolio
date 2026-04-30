# Metadata Open Graph & Twitter — Plan d'implémentation (sub-project 01 / Feature 5 SEO)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec source :** [docs/superpowers/specs/seo-referencement/01-metadata-base-design.md](../../specs/seo-referencement/01-metadata-base-design.md)

**Goal :** Doter chaque page publique FR/EN d'un title, description, openGraph, twitter et alternates hreflang corrects via un helper pur réutilisable, avec noindex automatique hors prod.

**Architecture :** Helper pur `buildPageMetadata({ locale, path, title, description, siteName, ogType? }): Metadata` ajouté à `src/lib/seo.ts` à côté des helpers existants. Chaque page appelle `setupLocaleMetadata(params)` (déjà en place) puis le helper avec les valeurs résolues via `t(...)`. Pas d'image OG ici (sub-project 02). Robots `noindex` activé automatiquement quand `process.env.NODE_ENV !== 'production'`.

**Tech Stack :** Next.js 16 App Router · TypeScript 6 strict · next-intl 4 (`localePrefix: 'always'`, FR/EN) · Vitest 4 (project `unit`, jsdom) · Prisma 7 (lecture seule via `findPublishedBySlug` déjà cachée).

**Rules à respecter (lecture dynamique) :**
- `.claude/rules/nextjs/metadata-seo.md`
- `.claude/rules/nextjs/routing.md`
- `.claude/rules/nextjs/tests.md`
- `.claude/rules/next-intl/setup.md`
- `.claude/rules/next-intl/translations.md`
- `.claude/rules/typescript/conventions.md`

**ADRs liés :** ADR-001 (monolithe Next.js), ADR-010 (i18n next-intl).

**Politique commits :** Pas de commit en cours de plan. La séquence complète est validée puis le user déclenche un commit unique en fin de workflow d'implémentation (cf. `~/.claude/CLAUDE.md` § Discipline commit). Les "checkpoints" entre tâches restent des points de validation visuelle/test, pas des commits.

---

## File Structure

| Fichier | Action | Rôle |
|---|---|---|
| `src/lib/seo.ts` | Modifier (étendre) | Ajouter `BuildPageMetadataInput` type + fonction pure `buildPageMetadata`. Conserver `siteUrl`, `localeToOgLocale`, `buildLanguageAlternates`, `setupLocaleMetadata`. |
| `src/lib/seo.test.ts` | Créer | Tests unitaires colocalisés du helper pur (Vitest, project unit, jsdom). |
| `src/app/[locale]/layout.tsx` | Modifier | Ajouter `twitter: { card: 'summary_large_image', siteName }` dans `generateMetadata` racine. Reste inchangé. |
| `src/app/[locale]/(public)/page.tsx` | Modifier | Remplacer le bloc `Metadata` par appel à `buildPageMetadata` (`path: ''`, `ogType: 'website'`). |
| `src/app/[locale]/(public)/services/page.tsx` | Modifier | Idem (`path: '/services'`). |
| `src/app/[locale]/(public)/a-propos/page.tsx` | Modifier | Factoriser `generateMetadata` existante via `buildPageMetadata` (`path: '/a-propos'`). |
| `src/app/[locale]/(public)/projets/page.tsx` | Modifier | Factoriser `generateMetadata` existante (utilise actuellement namespace `Projects.metaTitle/metaDescription`, à harmoniser sur `Metadata.projectsTitle/projectsDescription`). |
| `src/app/[locale]/(public)/contact/page.tsx` | Modifier | Factoriser `generateMetadata` existante via `buildPageMetadata` (`path: '/contact'`). |
| `src/app/[locale]/(public)/projets/[slug]/page.tsx` | Modifier | Factoriser via `buildPageMetadata` (`ogType: 'article'`, `notFound()` au lieu de `{ title: 'Not found' }` si `null`). |

**Non touchés :** `src/app/layout.tsx` (root non localisé), `messages/fr.json` et `messages/en.json` (clés `Metadata.*` toutes présentes), `src/i18n/*`, `src/server/queries/projects.ts`.

---

## Task 1 : Étendre `src/lib/seo.ts` — squelette + premier test (red)

**Files :**
- Modify: `src/lib/seo.ts` (ajouter type + fonction stub à la fin du fichier)
- Create: `src/lib/seo.test.ts`

- [ ] **Step 1 : Ajouter le squelette de `buildPageMetadata` dans `src/lib/seo.ts`**

Append à la fin du fichier (sans toucher aux exports existants) :

```typescript
import type { Metadata } from 'next'

export type BuildPageMetadataInput = {
  locale: Locale
  path: string
  title: string
  description: string
  siteName: string
  ogType?: 'website' | 'article'
}

export function buildPageMetadata(_input: BuildPageMetadataInput): Metadata {
  throw new Error('buildPageMetadata not implemented')
}
```

Note : `Locale` est déjà importé en haut du fichier.

- [ ] **Step 2 : Créer `src/lib/seo.test.ts` avec un premier test sur title/description**

```typescript
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildPageMetadata, type BuildPageMetadataInput } from './seo'

function buildInput(overrides?: Partial<BuildPageMetadataInput>): BuildPageMetadataInput {
  return {
    locale: 'fr',
    path: '/services',
    title: 'Services',
    description: 'Description des services',
    siteName: 'Thibaud Geisler : IA & Développement',
    ...overrides,
  }
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('buildPageMetadata', () => {
  it('passe title et description tels quels (le template est appliqué par Next.js via le root layout)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ title: 'X', description: 'Y' }))
    expect(meta.title).toBe('X')
    expect(meta.description).toBe('Y')
  })
})
```

- [ ] **Step 3 : Lancer le test pour vérifier qu'il échoue**

Run : `pnpm vitest run --project unit src/lib/seo.test.ts`
Expected : FAIL avec `Error: buildPageMetadata not implemented`.

---

## Task 2 : Implémenter title + description (green)

**Files :**
- Modify: `src/lib/seo.ts`

- [ ] **Step 1 : Remplacer le stub par l'implémentation minimale**

Dans `src/lib/seo.ts`, remplacer le corps de `buildPageMetadata` :

```typescript
export function buildPageMetadata({
  title,
  description,
}: BuildPageMetadataInput): Metadata {
  return {
    title,
    description,
  }
}
```

- [ ] **Step 2 : Re-lancer les tests**

Run : `pnpm vitest run --project unit src/lib/seo.test.ts`
Expected : PASS (1 test).

---

## Task 3 : openGraph (type, locale, url, siteName, title, description) — tests + impl

**Files :**
- Modify: `src/lib/seo.test.ts`
- Modify: `src/lib/seo.ts`

- [ ] **Step 1 : Ajouter les tests openGraph dans `src/lib/seo.test.ts`** (après le premier test, dans le même `describe`) :

```typescript
  it('utilise ogType="website" par défaut quand non fourni', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput())
    expect(meta.openGraph?.type).toBe('website')
  })

  it('utilise ogType="article" quand explicitement passé', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ ogType: 'article' }))
    expect(meta.openGraph?.type).toBe('article')
  })

  it('mappe locale fr → fr_FR et en → en_US dans openGraph.locale', () => {
    vi.stubEnv('NODE_ENV', 'production')
    expect(buildPageMetadata(buildInput({ locale: 'fr' })).openGraph?.locale).toBe('fr_FR')
    expect(buildPageMetadata(buildInput({ locale: 'en' })).openGraph?.locale).toBe('en_US')
  })

  it('compose openGraph.url absolue depuis siteUrl + locale + path', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://thibaud-geisler.com')
    const meta = buildPageMetadata(buildInput({ locale: 'fr', path: '/services' }))
    expect(meta.openGraph?.url).toBe('https://thibaud-geisler.com/fr/services')
  })

  it('home (path vide) : openGraph.url = siteUrl + /<locale> sans slash trailing', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://thibaud-geisler.com')
    const meta = buildPageMetadata(buildInput({ locale: 'fr', path: '' }))
    expect(meta.openGraph?.url).toBe('https://thibaud-geisler.com/fr')
  })

  it('case study (path nested) : openGraph.url couvre /<locale>/projets/<slug>', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://thibaud-geisler.com')
    const meta = buildPageMetadata(buildInput({ locale: 'en', path: '/projets/webapp-gestion-sinistres' }))
    expect(meta.openGraph?.url).toBe('https://thibaud-geisler.com/en/projets/webapp-gestion-sinistres')
  })

  it('expose siteName, title et description dans openGraph', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(
      buildInput({ siteName: 'Site', title: 'T', description: 'D' }),
    )
    expect(meta.openGraph?.siteName).toBe('Site')
    expect(meta.openGraph?.title).toBe('T')
    expect(meta.openGraph?.description).toBe('D')
  })
```

⚠️ Le helper `siteUrl` est lu **une fois** au chargement du module via `process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'`. `vi.stubEnv` après import ne le re-évalue pas. Solution : faire en sorte que `buildPageMetadata` lise dynamiquement `process.env.NEXT_PUBLIC_SITE_URL` à chaque appel (helper local). Voir Step 2.

- [ ] **Step 2 : Implémenter openGraph en lisant `siteUrl` dynamiquement**

Dans `src/lib/seo.ts`, remplacer `buildPageMetadata` par :

```typescript
export function buildPageMetadata({
  locale,
  path,
  title,
  description,
  siteName,
  ogType = 'website',
}: BuildPageMetadataInput): Metadata {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const url = `${base}/${locale}${path}`

  return {
    title,
    description,
    openGraph: {
      type: ogType,
      locale: localeToOgLocale[locale],
      url,
      siteName,
      title,
      description,
    },
  }
}
```

- [ ] **Step 3 : Lancer les tests**

Run : `pnpm vitest run --project unit src/lib/seo.test.ts`
Expected : PASS (8 tests).

---

## Task 4 : Twitter Cards — tests + impl

**Files :**
- Modify: `src/lib/seo.test.ts`
- Modify: `src/lib/seo.ts`

- [ ] **Step 1 : Ajouter le test twitter dans `src/lib/seo.test.ts`** (toujours dans le même `describe`) :

```typescript
  it('compose twitter avec card="summary_large_image", title et description', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ title: 'T', description: 'D' }))
    expect(meta.twitter).toEqual({
      card: 'summary_large_image',
      title: 'T',
      description: 'D',
    })
  })
```

- [ ] **Step 2 : Lancer le test pour le voir échouer (red)**

Run : `pnpm vitest run --project unit src/lib/seo.test.ts -t 'twitter'`
Expected : FAIL.

- [ ] **Step 3 : Ajouter `twitter` dans le retour de `buildPageMetadata`**

Dans `src/lib/seo.ts`, dans l'objet retourné, juste après `openGraph: { ... }` :

```typescript
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
```

- [ ] **Step 4 : Lancer les tests**

Run : `pnpm vitest run --project unit src/lib/seo.test.ts`
Expected : PASS (9 tests).

---

## Task 5 : Alternates (canonical absolu + languages) — tests + impl

**Files :**
- Modify: `src/lib/seo.test.ts`
- Modify: `src/lib/seo.ts`

- [ ] **Step 1 : Ajouter les tests alternates dans `src/lib/seo.test.ts`** :

```typescript
  it('canonical absolu = openGraph.url (cohérence interne)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://thibaud-geisler.com')
    const meta = buildPageMetadata(buildInput({ locale: 'fr', path: '/services' }))
    expect(meta.alternates?.canonical).toBe('https://thibaud-geisler.com/fr/services')
    expect(meta.alternates?.canonical).toBe(meta.openGraph?.url)
  })

  it('languages alternates expose fr, en et x-default via buildLanguageAlternates(path)', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput({ path: '/services' }))
    const langs = meta.alternates?.languages
    expect(langs).toBeDefined()
    expect(langs).toMatchObject({
      fr: '/fr/services',
      en: '/en/services',
      'x-default': '/fr/services',
    })
  })
```

- [ ] **Step 2 : Lancer pour voir les tests échouer**

Run : `pnpm vitest run --project unit src/lib/seo.test.ts -t 'alternates|canonical|languages'`
Expected : FAIL (les 2).

- [ ] **Step 3 : Ajouter `alternates` dans le retour de `buildPageMetadata`**

Dans `src/lib/seo.ts`, dans l'objet retourné, juste après `twitter: { ... }` :

```typescript
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(path),
    },
```

- [ ] **Step 4 : Lancer les tests**

Run : `pnpm vitest run --project unit src/lib/seo.test.ts`
Expected : PASS (11 tests).

---

## Task 6 : Robots noindex hors prod — tests + impl

**Files :**
- Modify: `src/lib/seo.test.ts`
- Modify: `src/lib/seo.ts`

- [ ] **Step 1 : Ajouter les tests robots dans `src/lib/seo.test.ts`** :

```typescript
  it('omet la clé robots quand NODE_ENV === "production"', () => {
    vi.stubEnv('NODE_ENV', 'production')
    const meta = buildPageMetadata(buildInput())
    expect(meta.robots).toBeUndefined()
  })

  it('retourne robots: { index: false, follow: false } quand NODE_ENV === "development"', () => {
    vi.stubEnv('NODE_ENV', 'development')
    const meta = buildPageMetadata(buildInput())
    expect(meta.robots).toEqual({ index: false, follow: false })
  })

  it('retourne robots: noindex quand NODE_ENV === "test"', () => {
    vi.stubEnv('NODE_ENV', 'test')
    const meta = buildPageMetadata(buildInput())
    expect(meta.robots).toEqual({ index: false, follow: false })
  })
```

- [ ] **Step 2 : Lancer pour voir les tests échouer**

Run : `pnpm vitest run --project unit src/lib/seo.test.ts -t 'robots'`
Expected : FAIL (3).

- [ ] **Step 3 : Ajouter la logique robots conditionnelle**

Dans `src/lib/seo.ts`, modifier le retour de `buildPageMetadata` :

```typescript
  const isProduction = process.env.NODE_ENV === 'production'

  return {
    title,
    description,
    openGraph: {
      type: ogType,
      locale: localeToOgLocale[locale],
      url,
      siteName,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: url,
      languages: buildLanguageAlternates(path),
    },
    ...(isProduction ? {} : { robots: { index: false, follow: false } }),
  }
```

(Insérer `const isProduction = ...` juste après `const url = ...` et utiliser le spread conditionnel à la fin de l'objet.)

- [ ] **Step 4 : Lancer la suite complète**

Run : `pnpm vitest run --project unit src/lib/seo.test.ts`
Expected : PASS (14 tests).

- [ ] **Step 5 : Quality gate intermédiaire**

Run : `pnpm typecheck`
Expected : 0 erreur (le helper est correctement typé `Metadata`).

---

## Task 7 : Root layout `[locale]/layout.tsx` — twitter racine + siteName

**Files :**
- Modify: `src/app/[locale]/layout.tsx` (lignes 38-58, fonction `generateMetadata`)

- [ ] **Step 1 : Lire l'état actuel de `generateMetadata` dans `src/app/[locale]/layout.tsx`** pour confirmer le bloc à modifier (lignes ~38-58 dans la version courante).

- [ ] **Step 2 : Ajouter `twitter` (siteName + card) dans le retour**

Modifier le `return` de `generateMetadata` pour ajouter :

```typescript
  return {
    metadataBase: new URL(siteUrl),
    title: {
      template: `%s | ${t('siteTitle')}`,
      default: t('siteTitle'),
    },
    description: t('siteDescription'),
    openGraph: {
      locale: localeToOgLocale[locale],
      siteName: t('siteTitle'),
    },
    twitter: {
      card: 'summary_large_image',
      siteName: t('siteTitle'),
    },
    alternates: {
      languages: buildLanguageAlternates(''),
    },
  }
```

(Ajouter le bloc `twitter: { ... }` après `openGraph` et avant `alternates`.)

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 8 : Brancher la home `/` sur `buildPageMetadata`

**Files :**
- Modify: `src/app/[locale]/(public)/page.tsx`

- [ ] **Step 1 : Mettre à jour les imports en haut du fichier**

Remplacer le bloc d'import `@/lib/seo` actuel par :

```typescript
import {
  buildPageMetadata,
  setupLocaleMetadata,
} from '@/lib/seo'
```

(Supprimer `buildLanguageAlternates`, `localeToOgLocale` qui deviennent inutiles ici puisqu'absorbés par le helper.)

- [ ] **Step 2 : Remplacer le corps de `generateMetadata`**

Remplacer le bloc actuel par :

```typescript
export async function generateMetadata({
  params,
}: PageProps<'/[locale]'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)
  return buildPageMetadata({
    locale,
    path: '',
    title: t('homeTitle'),
    description: t('homeDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
  })
}
```

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 9 : Brancher `/services`

**Files :**
- Modify: `src/app/[locale]/(public)/services/page.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Remplacer :

```typescript
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'
```

par :

```typescript
import { buildPageMetadata, setupLocaleMetadata } from '@/lib/seo'
```

- [ ] **Step 2 : Remplacer le corps de `generateMetadata`**

```typescript
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/services'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)
  return buildPageMetadata({
    locale,
    path: '/services',
    title: t('servicesTitle'),
    description: t('servicesDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
  })
}
```

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 10 : Brancher `/a-propos`

**Files :**
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx` (lignes 11-15 imports + 23-34 generateMetadata)

- [ ] **Step 1 : Mettre à jour les imports SEO**

Remplacer :

```typescript
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'
```

par :

```typescript
import { buildPageMetadata, setupLocaleMetadata } from '@/lib/seo'
```

- [ ] **Step 2 : Remplacer le corps de `generateMetadata`**

Remplacer entièrement la fonction `generateMetadata` actuelle (lignes ~23-34) par :

```typescript
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/a-propos'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)
  return buildPageMetadata({
    locale,
    path: '/a-propos',
    title: t('aboutTitle'),
    description: t('aboutDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
  })
}
```

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 11 : Brancher `/projets` (liste) + harmonisation namespace

**Files :**
- Modify: `src/app/[locale]/(public)/projets/page.tsx` (lignes 1-29 : imports + generateMetadata)

⚠️ Le code actuel utilise `getTranslations({ locale, namespace: 'Projects' })` puis `t('metaTitle')` / `t('metaDescription')`. **Harmoniser** sur `setupLocaleMetadata` + `Metadata.projectsTitle/projectsDescription` (clés déjà présentes dans `messages/{fr,en}.json` lignes 305-306). On ne touche pas au namespace `Projects.metaTitle/metaDescription` qui peut servir ailleurs.

- [ ] **Step 1 : Mettre à jour les imports**

Remplacer :

```typescript
import { setupLocalePage } from '@/i18n/locale-guard'
import { buildLanguageAlternates, localeToOgLocale } from '@/lib/seo'
import { hasLocale, type Locale } from 'next-intl'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
```

par :

```typescript
import { setupLocalePage } from '@/i18n/locale-guard'
import { buildPageMetadata, setupLocaleMetadata } from '@/lib/seo'
import type { Locale } from 'next-intl'
```

(Supprimer `hasLocale`, `notFound`, `routing` : encapsulés dans `setupLocaleMetadata`.)

- [ ] **Step 2 : Remplacer le corps de `generateMetadata`**

Remplacer la fonction `generateMetadata` actuelle (lignes ~15-29) par :

```typescript
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/projets'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)
  return buildPageMetadata({
    locale,
    path: '/projets',
    title: t('projectsTitle'),
    description: t('projectsDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
  })
}
```

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 12 : Brancher `/contact`

**Files :**
- Modify: `src/app/[locale]/(public)/contact/page.tsx`

- [ ] **Step 1 : Mettre à jour les imports SEO**

Remplacer :

```typescript
import {
  buildLanguageAlternates,
  localeToOgLocale,
  setupLocaleMetadata,
} from '@/lib/seo'
```

par :

```typescript
import { buildPageMetadata, setupLocaleMetadata } from '@/lib/seo'
```

- [ ] **Step 2 : Remplacer le corps de `generateMetadata`**

```typescript
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/contact'>): Promise<Metadata> {
  const { locale, t } = await setupLocaleMetadata(params)
  return buildPageMetadata({
    locale,
    path: '/contact',
    title: t('contactTitle'),
    description: t('contactDescription'),
    siteName: t('siteTitle'),
    ogType: 'website',
  })
}
```

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 13 : Brancher `/projets/[slug]` (case study, ogType article + notFound)

**Files :**
- Modify: `src/app/[locale]/(public)/projets/[slug]/page.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Remplacer :

```typescript
import { buildLanguageAlternates, localeToOgLocale, setupLocaleMetadata } from '@/lib/seo'
```

par :

```typescript
import { buildPageMetadata, setupLocaleMetadata } from '@/lib/seo'
```

(Conserver `import { notFound } from 'next/navigation'` déjà présent.)

- [ ] **Step 2 : Remplacer le corps de `generateMetadata`**

Remplacer la fonction `generateMetadata` (lignes ~9-28) par :

```typescript
export async function generateMetadata({
  params,
}: PageProps<'/[locale]/projets/[slug]'>): Promise<Metadata> {
  const { locale, slug, t } = await setupLocaleMetadata(params)

  const project = await findPublishedBySlug(slug, locale)
  if (!project) notFound()

  return buildPageMetadata({
    locale,
    path: `/projets/${slug}`,
    title: project.title,
    description: project.description,
    siteName: t('siteTitle'),
    ogType: 'article',
  })
}
```

(Le `notFound()` remplace l'ancien `return { title: 'Not found' }` pour aligner sur le composant page qui appelait déjà `notFound()` côté default export. Pas d'indexation d'une page d'erreur.)

- [ ] **Step 3 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 14 : Quality gates statiques (lint + typecheck + tests unit)

**Files :** aucun, lancement des outils.

- [ ] **Step 1 : Lint**

Run : `pnpm lint` (ou `just lint`)
Expected : 0 erreur, 0 warning bloquant.

- [ ] **Step 2 : Typecheck**

Run : `just typecheck` (lance `pnpm next typegen && pnpm typecheck`)
Expected : 0 erreur. Vérifier en particulier que `Metadata` retourné par `buildPageMetadata` est compatible partout (`PageProps<'/[locale]/...'>` aligné).

- [ ] **Step 3 : Tests unit complets**

Run : `just test-unit` (`pnpm vitest run --project unit --passWithNoTests`)
Expected : tous les tests unit passent, dont les ~14 cas de `src/lib/seo.test.ts`.

- [ ] **Step 4 : Tests integration (sanity check, ils ne devraient pas régresser)**

Run : `just test-integration`
Expected : suites integration vertes (le sub-project ne touche ni `src/server/queries/projects.ts` ni `src/server/actions/*`, mais on confirme qu'aucun import collatéral n'a cassé).

---

## Task 15 : Validation manuelle end-to-end (5 scénarios spec)

**Files :** aucun, vérification visuelle. Lancer le serveur en mode prod pour reproduire le comportement réel d'indexation.

> **Pré-requis** : `docker compose up -d --wait postgres` (postgres up + Prisma migrate déjà fait), `.env` rempli (`NEXT_PUBLIC_SITE_URL=http://localhost:3000` en dev local, ce qui sera utilisé pour calculer les URLs absolues — la valeur exacte pour la prod sera substituée via Dokploy au déploiement).

- [ ] **Step 1 : Build prod local**

Run : `pnpm build && pnpm start`
Expected : `next start` écoute sur `http://localhost:3000`. `NODE_ENV` = `production` automatique.

- [ ] **Step 2 : Scénario 1 — page statique FR (services)**

Run : `curl -s http://localhost:3000/fr/services | grep -E '<title>|name="description"|property="og:|name="twitter:|rel="(canonical|alternate)"'`

Expected (extraits attendus) :
- `<title>Services | Thibaud Geisler : IA & Développement</title>`
- `<meta name="description" content="..."/>` (issu de `Metadata.servicesDescription`)
- `<meta property="og:type" content="website"/>`
- `<meta property="og:locale" content="fr_FR"/>`
- `<meta property="og:url" content="http://localhost:3000/fr/services"/>` (URL absolue)
- `<meta property="og:site_name" content="Thibaud Geisler : IA & Développement"/>`
- `<meta property="og:title" content="Services"/>`
- `<meta name="twitter:card" content="summary_large_image"/>`
- `<link rel="canonical" href="http://localhost:3000/fr/services"/>`
- `<link rel="alternate" hreflang="fr" href="/fr/services"/>`
- `<link rel="alternate" hreflang="en" href="/en/services"/>`
- `<link rel="alternate" hreflang="x-default" href="/fr/services"/>`
- **Pas** de `<meta name="robots" content="noindex...">` (mode production).

- [ ] **Step 3 : Scénario 2 — même page en EN**

Run : `curl -s http://localhost:3000/en/services | grep -E 'og:locale|og:url|canonical'`
Expected :
- `og:locale = en_US`
- `og:url = http://localhost:3000/en/services`
- `canonical = http://localhost:3000/en/services`

- [ ] **Step 4 : Scénario 3 — case study `/projets/[slug]` (og:type article)**

Choisir un slug existant publié en base (ex : un slug déjà seedé via `prisma/seed-data/projects.ts`).

Run : `curl -s http://localhost:3000/fr/projets/<slug> | grep -E 'og:type|og:url|canonical|<title>'`

Expected :
- `og:type = article` (et non `website`)
- `og:url = http://localhost:3000/fr/projets/<slug>`
- `canonical = http://localhost:3000/fr/projets/<slug>`
- `<title>` reprenant `project.title` (locale FR) suivi de `| Thibaud Geisler : IA & Développement`.

- [ ] **Step 5 : Scénario 4 — slug projet inexistant → 404**

Run : `curl -sI http://localhost:3000/fr/projets/inconnu-aaa-bbb`
Expected : `HTTP/1.1 404 Not Found`. Vérifier dans les logs `next start` que `notFound()` est bien atteint depuis `generateMetadata` (et non un dump de metadata avec `title: 'Not found'`).

- [ ] **Step 6 : Scénario 5 — noindex auto en mode dev**

Arrêter `next start` (Ctrl+C ou `just stop`). Lancer `pnpm dev` puis :

Run : `curl -s http://localhost:3000/fr/services | grep 'name="robots"'`
Expected : `<meta name="robots" content="noindex,nofollow"/>`. Confirme la branche `NODE_ENV !== 'production'`.

Re-lancer `pnpm build && pnpm start` pour confirmer que la balise disparaît à nouveau en prod (cohérence Step 2).

- [ ] **Step 7 : Smoke test final via Open Graph debugger (optionnel mais recommandé)**

Si `ngrok` ou tunneling disponible, exposer `http://localhost:3000` puis tester l'URL via :
- [https://opengraph.xyz/](https://opengraph.xyz/)
- [https://cards-dev.twitter.com/validator](https://cards-dev.twitter.com/validator) (ou X Developer Platform Card Validator si renommé)

Expected : aperçu social sans image (les images viendront au sub-project 02), avec titre + description + site name corrects en FR et EN.

---

## Self-review (post-écriture, fait par l'auteur du plan)

1. **Couverture spec** :
   - Helper pur `buildPageMetadata` → Tasks 1-6 ✅
   - Tests unitaires colocalisés (~14 cas) → Tasks 1-6 ✅ (un cas de plus par rapport au spec à cause du test `siteName` ajouté ; plus une variante `NODE_ENV=test` pour solidité)
   - Modification root layout `[locale]` (twitter card) → Task 7 ✅
   - 6 pages branchées (home, services, à-propos, projets, contact, projets/[slug]) → Tasks 8-13 ✅
   - Acceptance criteria 5 scénarios GIVEN/WHEN/THEN → Task 15 (Steps 2-6) ✅
   - Edge cases (path vide, path nested, NODE_ENV non-prod) → Tasks 3 et 6 ✅
   - `notFound()` au lieu de `{ title: 'Not found' }` → Task 13 ✅
   - Pas de modification de `messages/*.json`, `src/i18n/*`, `src/app/layout.tsx` root → respecté (aucune task ne les touche) ✅

2. **Placeholder scan** :
   - Aucun `TBD` / `TODO` / `à compléter` dans les snippets de code.
   - Les commandes `pnpm` / `just` sont exactes et reproductibles.
   - Aucun "similar to Task N" : chaque task contient son code complet.

3. **Type consistency** :
   - Le type `BuildPageMetadataInput` est défini Task 1 avec `siteName: string` et utilisé partout (Tasks 8-13) avec `siteName: t('siteTitle')`.
   - `Metadata` de `next` importé Task 1 et présent en signature de toutes les `generateMetadata`.
   - `Locale` importé une fois en haut de `src/lib/seo.ts` (déjà existant).
   - Le helper retourne strict `Metadata`, vérifié par `pnpm typecheck` Task 6 Step 5 et Task 14 Step 2.

Plan complet.
