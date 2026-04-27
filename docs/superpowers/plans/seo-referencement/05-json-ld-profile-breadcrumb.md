# JSON-LD ProfilePage + Person + BreadcrumbList — Plan d'implémentation (sub-project 05 / Feature 5 SEO)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec source :** [docs/superpowers/specs/seo-referencement/05-json-ld-profile-breadcrumb-design.md](../../specs/seo-referencement/05-json-ld-profile-breadcrumb-design.md)

**Goal :** Injecter du JSON-LD `ProfilePage` + `Person` (avec `sameAs`, `email`, `image`, `knowsAbout` au format Thing+Wikidata) sur `/a-propos`, et `BreadcrumbList` sur `/services`, `/projets`, `/projets/[slug]` (avec segment dynamique = titre projet localisé) pour activer les rich results "Profile page" et "Breadcrumbs" dans les SERPs Google.

**Architecture :** Quatre unités séparées par responsabilité — (1) constante typée `EXPERTISE` (4 disciplines avec mapping Wikidata) dans `src/config/expertise.ts`, (2) helpers purs `buildProfilePagePerson()` + `buildBreadcrumbList()` dans `src/lib/seo/json-ld.ts` (testables sans mock), (3) Server Component `<JsonLd>` générique dans `src/components/seo/json-ld.tsx` (5 lignes, échappement `</script>`), (4) intégration dans 4 pages (a-propos avec ProfilePage+Person, services/projets liste/projets[slug] avec BreadcrumbList).

**Tech Stack :** Next.js 16.2.4 App Router · TypeScript 6 strict · React 19.2.5 · next-intl 4.9.1 (`localePrefix: 'always'`, FR/EN) · Vitest 4 (project unit jsdom).

**Rules à respecter (lecture dynamique) :**
- `.claude/rules/nextjs/metadata-seo.md` (cœur : JSON-LD, échappement `</script>` via `<`, Server Component injection)
- `.claude/rules/nextjs/server-client-components.md` (composant Server pur, pas de hooks)
- `.claude/rules/nextjs/routing.md` (params async, `notFound()` déjà géré côté page parente)
- `.claude/rules/next-intl/translations.md` (`getTranslations` async côté serveur)
- `.claude/rules/typescript/conventions.md` (alias `@/*`, types via `as const`, `z.infer`)
- `.claude/rules/vitest/setup.md` (project unit jsdom, factories pour fixtures)
- `.claude/rules/nextjs/tests.md`
- `.claude/rules/react/hooks.md` (rappel : aucun hook utilisé, composants Server purs)

**ADRs liés :** ADR-001 (monolithe Next.js), ADR-006 (hub de démos, JSON-LD signe l'identité personnelle), ADR-010 (i18n FR/EN, valeurs traduites via next-intl messages).

**Politique commits :** Pas de commit en cours de plan. La séquence complète est validée puis le user déclenche un commit unique en fin de workflow d'implémentation (cf. `~/.claude/CLAUDE.md` § Discipline commit).

---

## File Structure

| Fichier | Action | Rôle |
|---|---|---|
| `src/config/expertise.ts` | Créer | Constante `EXPERTISE` (4 disciplines avec mapping Wikidata) + type `Expertise`. Pattern aligné avec `src/config/social-links.ts`. |
| `src/lib/seo/json-ld.ts` | Créer | Helpers purs `buildProfilePagePerson()` + `buildBreadcrumbList()` + types JSON-LD. Pas de side effect, testables sans mock. |
| `src/lib/seo/json-ld.test.ts` | Créer | Tests unitaires colocalisés Vitest project unit (jsdom). 15 cas couvrant les 2 helpers. |
| `src/components/seo/json-ld.tsx` | Créer | Server Component générique `<JsonLd data={...}>` avec échappement `</script>` via `replace(/</g, '\\u003c')`. ~5 lignes. |
| `messages/fr.json` | Modifier | Ajouter au namespace `Metadata` : `jobTitle`, `breadcrumbHome`, `breadcrumbServices`, `breadcrumbProjects` (valeurs FR). |
| `messages/en.json` | Modifier | Idem en EN. |
| `src/app/[locale]/(public)/a-propos/page.tsx` | Modifier | Ajouter dans le composant default export (après `setupLocalePage`) : appel `buildProfilePagePerson(...)` + `<JsonLd data={...} />` injecté à la fin du `<main>`. |
| `src/app/[locale]/(public)/services/page.tsx` | Modifier | Ajouter `<JsonLd data={buildBreadcrumbList(...)} />` avec items `[Home, Services]`. |
| `src/app/[locale]/(public)/projets/page.tsx` | Modifier | Idem avec items `[Home, Projects]`. |
| `src/app/[locale]/(public)/projets/[slug]/page.tsx` | Modifier | Idem avec items `[Home, Projects, project.title]` (segment dynamique réutilisant `findPublishedBySlug` déjà appelée par la page). |

**Non touchés** : `src/lib/seo.ts` (sub-project 01 read-only, on consomme `siteUrl`), `src/server/queries/projects.ts` (réutilise `findPublishedBySlug` existante), `src/config/social-links.ts` (read-only pour `sameAs`), `src/lib/assets.ts` (read-only pour `buildAssetUrl`), `next.config.ts`, `package.json`, `prisma/schema.prisma`. Pages `/` (home) et `/contact` non modifiées (volontairement sans BreadcrumbList, YAGNI tracé en spec).

---

## Task 1 : Créer la constante `EXPERTISE`

**Files :**
- Create: `src/config/expertise.ts`

- [ ] **Step 1 : Créer le fichier `src/config/expertise.ts`**

```typescript
export const EXPERTISE = [
  {
    name: 'Artificial Intelligence',
    wikidataId: 'Q11660',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
  },
  {
    name: 'Software Engineering',
    wikidataId: 'Q638608',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Software_engineering',
  },
  {
    name: 'Web Development',
    wikidataId: 'Q386275',
    wikipediaUrl: 'https://en.wikipedia.org/wiki/Web_development',
  },
  { name: 'AI Training' },
] as const

export type Expertise = (typeof EXPERTISE)[number]
```

> **Notes** :
> - `as const` impose un typage strict (chaque entrée a un type littéral, le tableau est readonly).
> - Type `Expertise` = union des 4 entrées concrètes, utilisé par les helpers downstream.
> - Pas de wikidataId pour `AI Training` : pas de page Wikidata dédiée (cf. spec § Architectural decisions). Le helper produira une string simple pour cette entrée, conforme à la mixité `string | Thing` de schema.org.

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 2 : Tests rouges du helper `buildProfilePagePerson`

**Files :**
- Create: `src/lib/seo/json-ld.test.ts`

> Stratégie TDD : on écrit d'abord les 9 tests `buildProfilePagePerson` + 5 tests `buildBreadcrumbList` (Task 3), on les voit tous échouer (module inexistant), puis on implémente dans Tasks 4 et 5.

- [ ] **Step 1 : Créer le fichier `src/lib/seo/json-ld.test.ts` avec les tests `buildProfilePagePerson`**

```typescript
import { describe, expect, it } from 'vitest'

import {
  buildBreadcrumbList,
  buildProfilePagePerson,
  type ProfilePagePersonInput,
  type BreadcrumbListInput,
} from './json-ld'

const SITE_URL_FIXTURE = 'https://thibaud-geisler.com'

function buildProfileInput(
  overrides?: Partial<ProfilePagePersonInput>,
): ProfilePagePersonInput {
  return {
    locale: 'fr',
    siteUrl: SITE_URL_FIXTURE,
    name: 'Thibaud Geisler',
    jobTitle: 'IA & développement full-stack',
    description: 'Description courte test',
    email: 'contact@thibaud-geisler.com',
    image: 'https://thibaud-geisler.com/api/assets/branding/portrait.jpg',
    sameAs: [
      'https://www.linkedin.com/in/thibaud-geisler/',
      'https://github.com/thibaud57',
    ],
    expertise: [
      {
        name: 'Artificial Intelligence',
        wikidataId: 'Q11660',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
      },
      { name: 'AI Training' },
    ],
    ...overrides,
  }
}

describe('buildProfilePagePerson', () => {
  it('produit @context schema.org et @type ProfilePage à la racine', () => {
    const result = buildProfilePagePerson(buildProfileInput())
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('ProfilePage')
  })

  it('imbrique mainEntity de @type Person avec toutes les propriétés requises', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        name: 'Thibaud Geisler',
        jobTitle: 'IA & développement full-stack',
        description: 'desc',
        email: 'a@b.c',
      }),
    )
    expect(result.mainEntity['@type']).toBe('Person')
    expect(result.mainEntity['@id']).toBeDefined()
    expect(result.mainEntity.name).toBe('Thibaud Geisler')
    expect(result.mainEntity.jobTitle).toBe('IA & développement full-stack')
    expect(result.mainEntity.description).toBe('desc')
    expect(result.mainEntity.email).toBe('a@b.c')
  })

  it('Person.@id locale-agnostic = siteUrl + /#person (même valeur en FR et EN)', () => {
    const fr = buildProfilePagePerson(buildProfileInput({ locale: 'fr' }))
    const en = buildProfilePagePerson(buildProfileInput({ locale: 'en' }))
    expect(fr.mainEntity['@id']).toBe('https://thibaud-geisler.com/#person')
    expect(en.mainEntity['@id']).toBe('https://thibaud-geisler.com/#person')
    expect(fr.mainEntity['@id']).toBe(en.mainEntity['@id'])
  })

  it('Person.url = siteUrl + /<locale>/a-propos', () => {
    expect(
      buildProfilePagePerson(buildProfileInput({ locale: 'fr' })).mainEntity.url,
    ).toBe('https://thibaud-geisler.com/fr/a-propos')
    expect(
      buildProfilePagePerson(buildProfileInput({ locale: 'en' })).mainEntity.url,
    ).toBe('https://thibaud-geisler.com/en/a-propos')
  })

  it('Person.image est une URL absolue', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        image: 'https://thibaud-geisler.com/api/assets/branding/portrait.jpg',
      }),
    )
    expect(result.mainEntity.image).toMatch(/^https?:\/\//)
  })

  it('Person.sameAs contient les URLs externes passées en argument', () => {
    const sameAs = [
      'https://www.linkedin.com/in/thibaud-geisler/',
      'https://github.com/thibaud57',
    ]
    const result = buildProfilePagePerson(buildProfileInput({ sameAs }))
    expect(result.mainEntity.sameAs).toEqual(sameAs)
  })

  it('mappe expertise avec wikidataId vers Thing complet (@type, name, @id Wikidata, sameAs Wikipedia)', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        expertise: [
          {
            name: 'Artificial Intelligence',
            wikidataId: 'Q11660',
            wikipediaUrl: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
          },
        ],
      }),
    )
    expect(result.mainEntity.knowsAbout).toEqual([
      {
        '@type': 'Thing',
        name: 'Artificial Intelligence',
        '@id': 'https://www.wikidata.org/wiki/Q11660',
        sameAs: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
      },
    ])
  })

  it('mappe expertise sans wikidataId vers string simple', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({ expertise: [{ name: 'AI Training' }] }),
    )
    expect(result.mainEntity.knowsAbout).toEqual(['AI Training'])
  })

  it('respecte l\'ordre des entrées EXPERTISE (Thing puis string)', () => {
    const result = buildProfilePagePerson(
      buildProfileInput({
        expertise: [
          {
            name: 'Artificial Intelligence',
            wikidataId: 'Q11660',
            wikipediaUrl: 'https://en.wikipedia.org/wiki/Artificial_intelligence',
          },
          { name: 'AI Training' },
        ],
      }),
    )
    expect(result.mainEntity.knowsAbout).toHaveLength(2)
    expect((result.mainEntity.knowsAbout[0] as { name: string }).name).toBe(
      'Artificial Intelligence',
    )
    expect(result.mainEntity.knowsAbout[1]).toBe('AI Training')
  })

  it('expose dateModified au format ISO 8601 sur ProfilePage', () => {
    const result = buildProfilePagePerson(buildProfileInput())
    expect(result.dateModified).toBeDefined()
    expect(new Date(result.dateModified).toISOString()).toBe(result.dateModified)
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent (red)**

Run : `pnpm vitest run --project unit src/lib/seo/json-ld.test.ts`
Expected : FAIL avec `Cannot find module './json-ld'`. Tous les tests sont concernés.

---

## Task 3 : Tests rouges du helper `buildBreadcrumbList`

**Files :**
- Modify: `src/lib/seo/json-ld.test.ts` (append au fichier de Task 2)

- [ ] **Step 1 : Ajouter à la fin de `src/lib/seo/json-ld.test.ts` les tests `buildBreadcrumbList`**

```typescript
function buildBreadcrumbInput(
  overrides?: Partial<BreadcrumbListInput>,
): BreadcrumbListInput {
  return {
    locale: 'fr',
    siteUrl: SITE_URL_FIXTURE,
    items: [
      { name: 'Accueil', path: '' },
      { name: 'Services', path: '/services' },
    ],
    ...overrides,
  }
}

describe('buildBreadcrumbList', () => {
  it('produit @context schema.org et @type BreadcrumbList', () => {
    const result = buildBreadcrumbList(buildBreadcrumbInput())
    expect(result['@context']).toBe('https://schema.org')
    expect(result['@type']).toBe('BreadcrumbList')
  })

  it('itemListElement contient un ListItem par segment passé', () => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        items: [
          { name: 'Home', path: '' },
          { name: 'Projects', path: '/projets' },
          { name: 'Digiclaims', path: '/projets/digiclaims' },
        ],
      }),
    )
    expect(result.itemListElement).toHaveLength(3)
  })

  it('chaque ListItem a position 1-based, name et item URL absolue', () => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        items: [{ name: 'Home', path: '' }, { name: 'Services', path: '/services' }],
      }),
    )
    expect(result.itemListElement[0]).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Home',
      item: 'https://thibaud-geisler.com/fr',
    })
    expect(result.itemListElement[1]).toEqual({
      '@type': 'ListItem',
      position: 2,
      name: 'Services',
      item: 'https://thibaud-geisler.com/fr/services',
    })
  })

  it('item URL = siteUrl + /<locale> + path en EN', () => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        locale: 'en',
        items: [{ name: 'Home', path: '' }, { name: 'Services', path: '/services' }],
      }),
    )
    expect(result.itemListElement[0]?.item).toBe('https://thibaud-geisler.com/en')
    expect(result.itemListElement[1]?.item).toBe(
      'https://thibaud-geisler.com/en/services',
    )
  })

  it('respecte l\'ordre des items (parent → enfant)', () => {
    const result = buildBreadcrumbList(
      buildBreadcrumbInput({
        items: [
          { name: 'Home', path: '' },
          { name: 'Projects', path: '/projets' },
          { name: 'Digiclaims', path: '/projets/digiclaims' },
        ],
      }),
    )
    expect(result.itemListElement.map((e) => e.position)).toEqual([1, 2, 3])
    expect(result.itemListElement.map((e) => e.name)).toEqual([
      'Home',
      'Projects',
      'Digiclaims',
    ])
  })
})
```

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils échouent (red)**

Run : `pnpm vitest run --project unit src/lib/seo/json-ld.test.ts`
Expected : FAIL — les 15 tests échouent tous (`buildProfilePagePerson` et `buildBreadcrumbList` non implémentées).

---

## Task 4 : Implémenter les helpers `buildProfilePagePerson` + `buildBreadcrumbList` (green)

**Files :**
- Create: `src/lib/seo/json-ld.ts`

- [ ] **Step 1 : Créer le fichier `src/lib/seo/json-ld.ts`**

```typescript
import type { Locale } from 'next-intl'

type Locale_ = Locale

type ExpertiseEntry = {
  readonly name: string
  readonly wikidataId?: string
  readonly wikipediaUrl?: string
}

type KnowsAboutEntry =
  | string
  | {
      '@type': 'Thing'
      name: string
      '@id': string
      sameAs: string
    }

export type ProfilePagePersonInput = {
  locale: Locale_
  siteUrl: string
  name: string
  jobTitle: string
  description: string
  email: string
  image: string
  sameAs: readonly string[]
  expertise: readonly ExpertiseEntry[]
}

export type ProfilePagePerson = {
  '@context': 'https://schema.org'
  '@type': 'ProfilePage'
  dateModified: string
  mainEntity: {
    '@type': 'Person'
    '@id': string
    name: string
    jobTitle: string
    description: string
    url: string
    email: string
    image: string
    sameAs: readonly string[]
    knowsAbout: KnowsAboutEntry[]
  }
}

export type BreadcrumbListInput = {
  locale: Locale_
  siteUrl: string
  items: readonly { name: string; path: string }[]
}

export type BreadcrumbList = {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: {
    '@type': 'ListItem'
    position: number
    name: string
    item: string
  }[]
}

function normalizeBase(siteUrl: string): string {
  return siteUrl.replace(/\/$/, '')
}

function mapExpertise(entry: ExpertiseEntry): KnowsAboutEntry {
  if (entry.wikidataId && entry.wikipediaUrl) {
    return {
      '@type': 'Thing',
      name: entry.name,
      '@id': `https://www.wikidata.org/wiki/${entry.wikidataId}`,
      sameAs: entry.wikipediaUrl,
    }
  }
  return entry.name
}

export function buildProfilePagePerson(
  input: ProfilePagePersonInput,
): ProfilePagePerson {
  const base = normalizeBase(input.siteUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfilePage',
    dateModified: new Date().toISOString(),
    mainEntity: {
      '@type': 'Person',
      '@id': `${base}/#person`,
      name: input.name,
      jobTitle: input.jobTitle,
      description: input.description,
      url: `${base}/${input.locale}/a-propos`,
      email: input.email,
      image: input.image,
      sameAs: input.sameAs,
      knowsAbout: input.expertise.map(mapExpertise),
    },
  }
}

export function buildBreadcrumbList(input: BreadcrumbListInput): BreadcrumbList {
  const base = normalizeBase(input.siteUrl)
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: input.items.map((entry, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: entry.name,
      item: `${base}/${input.locale}${entry.path}`,
    })),
  }
}
```

> **Notes** :
> - `normalizeBase` strip le trailing slash (cohérent avec `buildSitemapEntries` du sub-project 03 et `app/robots.ts` du sub-project 04).
> - `mainEntity['@id']: \`${base}/#person\`` est volontairement **locale-agnostic** (même valeur pour FR et EN) car c'est la même entité Person quelle que soit la version visitée. Permet le linking depuis d'autres schémas futurs (`Article` post-MVP avec `author: { '@id': '<siteUrl>/#person' }`) sans redéclarer Person.
> - `mapExpertise` produit un `Thing` complet quand `wikidataId` ET `wikipediaUrl` sont présents, sinon string simple. Type `KnowsAboutEntry` est l'union qui modélise ça.
> - `dateModified: new Date().toISOString()` est calculé au moment du render (pas du build) côté serveur. Le test "dateModified ISO 8601" valide juste le format, pas la valeur exacte.
> - Pas d'import `'server-only'` : le helper est pur, peut techniquement tourner côté client (mais ne le fera pas en pratique car invoqué dans des Server Components).

- [ ] **Step 2 : Lancer les tests pour vérifier qu'ils passent (green)**

Run : `pnpm vitest run --project unit src/lib/seo/json-ld.test.ts`
Expected : PASS — les 15 tests passent.

- [ ] **Step 3 : Quality gate intermédiaire**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 5 : Créer le Server Component `<JsonLd>`

**Files :**
- Create: `src/components/seo/json-ld.tsx`

- [ ] **Step 1 : Créer le fichier `src/components/seo/json-ld.tsx`**

```tsx
type Props = {
  data: object
}

export function JsonLd({ data }: Props) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
```

> **Notes** :
> - 5 lignes, single responsibility.
> - L'échappement `<` → `<` neutralise toute occurrence accidentelle de `</script>` dans le JSON sérialisé (cf. spec § Acceptance scénario 5).
> - Server Component pur (pas de `'use client'`, aucun hook).
> - React 19 hoist automatiquement les `<script>` dans `<head>` même quand le composant est rendu dans le `<body>`.
> - Pas de tests dédiés (no-lib-test, 5 lignes triviales).

- [ ] **Step 2 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 6 : Étendre les messages i18n

**Files :**
- Modify: `messages/fr.json` (ajouter au namespace `Metadata`, après `contactDescription`)
- Modify: `messages/en.json` (idem)

- [ ] **Step 1 : Ajouter 4 nouvelles clés dans `messages/fr.json` namespace `Metadata`**

Dans le bloc `"Metadata": { ... }` (lignes 298-313 actuellement), ajouter avant la `}` de fermeture :

```json
    "jobTitle": "IA & développement full-stack",
    "breadcrumbHome": "Accueil",
    "breadcrumbServices": "Services",
    "breadcrumbProjects": "Projets"
```

(Bien penser à mettre une virgule après `contactDescription` ligne précédente.)

- [ ] **Step 2 : Ajouter les mêmes clés dans `messages/en.json` namespace `Metadata`**

```json
    "jobTitle": "AI & full-stack development",
    "breadcrumbHome": "Home",
    "breadcrumbServices": "Services",
    "breadcrumbProjects": "Projects"
```

- [ ] **Step 3 : Vérifier que TypeScript reconnaît les nouvelles clés**

Run : `pnpm typecheck`
Expected : 0 erreur. La déclaration `declare module 'next-intl' { interface AppConfig { Messages: typeof messages } }` dans `src/i18n/types.ts` propage automatiquement les types des nouvelles clés.

---

## Task 7 : Brancher `/a-propos` (ProfilePage + Person)

**Files :**
- Modify: `src/app/[locale]/(public)/a-propos/page.tsx`

- [ ] **Step 1 : Mettre à jour les imports en haut du fichier**

Ajouter (en respectant l'ordre alphabétique groupé par catégorie) :

```typescript
import { JsonLd } from '@/components/seo/json-ld'
import { EXPERTISE } from '@/config/expertise'
import { SOCIAL_LINKS } from '@/config/social-links'
import { buildAssetUrl } from '@/lib/assets'
import { siteUrl } from '@/lib/seo'
import { buildProfilePagePerson } from '@/lib/seo/json-ld'
```

- [ ] **Step 2 : Construire l'objet ProfilePagePerson dans le composant default export**

Après `const { locale } = await setupLocalePage(params)` :

```typescript
  const tMeta = await getTranslations({ locale, namespace: 'Metadata' })

  const sameAs = SOCIAL_LINKS.filter((link) => link.slug !== 'email').map(
    (link) => link.url,
  )
  const emailEntry = SOCIAL_LINKS.find((link) => link.slug === 'email')
  const email = emailEntry?.url.replace(/^mailto:/, '') ?? ''

  const profileJsonLd = buildProfilePagePerson({
    locale,
    siteUrl,
    name: 'Thibaud Geisler',
    jobTitle: tMeta('jobTitle'),
    description: tMeta('aboutDescription'),
    email,
    image: `${siteUrl.replace(/\/$/, '')}${buildAssetUrl('branding/portrait.jpg')}`,
    sameAs,
    expertise: EXPERTISE,
  })
```

- [ ] **Step 3 : Injecter `<JsonLd>` à la fin du `<main>`**

Juste avant le `</main>` de fermeture du JSX retourné par `AProposPage` :

```tsx
      <JsonLd data={profileJsonLd} />
```

- [ ] **Step 4 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 8 : Brancher `/services` (BreadcrumbList)

**Files :**
- Modify: `src/app/[locale]/(public)/services/page.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Ajouter :

```typescript
import { JsonLd } from '@/components/seo/json-ld'
import { siteUrl } from '@/lib/seo'
import { buildBreadcrumbList } from '@/lib/seo/json-ld'
```

- [ ] **Step 2 : Construire le BreadcrumbList dans le composant default export**

Après `await setupLocalePage(params)` :

```typescript
  const tMeta = await getTranslations({ locale, namespace: 'Metadata' })

  const breadcrumbJsonLd = buildBreadcrumbList({
    locale,
    siteUrl,
    items: [
      { name: tMeta('breadcrumbHome'), path: '' },
      { name: tMeta('breadcrumbServices'), path: '/services' },
    ],
  })
```

(Note : `setupLocalePage(params)` renvoie déjà `{ locale }` qu'on peut utiliser. Si la page actuelle n'expose pas `locale` dans la portée, l'extraire via `const { locale } = await setupLocalePage(params)`.)

- [ ] **Step 3 : Injecter `<JsonLd>` à la fin du JSX retourné**

Juste avant la dernière balise fermante du composant page :

```tsx
      <JsonLd data={breadcrumbJsonLd} />
```

- [ ] **Step 4 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 9 : Brancher `/projets` liste (BreadcrumbList)

**Files :**
- Modify: `src/app/[locale]/(public)/projets/page.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Ajouter :

```typescript
import { JsonLd } from '@/components/seo/json-ld'
import { siteUrl } from '@/lib/seo'
import { buildBreadcrumbList } from '@/lib/seo/json-ld'
```

- [ ] **Step 2 : Construire le BreadcrumbList**

Après `await setupLocalePage(params)` :

```typescript
  const tMeta = await getTranslations({ locale, namespace: 'Metadata' })

  const breadcrumbJsonLd = buildBreadcrumbList({
    locale,
    siteUrl,
    items: [
      { name: tMeta('breadcrumbHome'), path: '' },
      { name: tMeta('breadcrumbProjects'), path: '/projets' },
    ],
  })
```

- [ ] **Step 3 : Injecter `<JsonLd>` à la fin du JSX**

```tsx
      <JsonLd data={breadcrumbJsonLd} />
```

- [ ] **Step 4 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 10 : Brancher `/projets/[slug]` (BreadcrumbList dynamique)

**Files :**
- Modify: `src/app/[locale]/(public)/projets/[slug]/page.tsx`

- [ ] **Step 1 : Mettre à jour les imports**

Ajouter :

```typescript
import { JsonLd } from '@/components/seo/json-ld'
import { siteUrl } from '@/lib/seo'
import { buildBreadcrumbList } from '@/lib/seo/json-ld'
```

- [ ] **Step 2 : Construire le BreadcrumbList avec `project.title` localisé**

La page actuelle appelle déjà `findPublishedBySlug(slug, locale)` et le composant se charge du `notFound()` si null. Après cette branche, ajouter dans le composant default export (après le check `if (!project) notFound()`) :

```typescript
  const tMeta = await getTranslations({ locale, namespace: 'Metadata' })

  const breadcrumbJsonLd = buildBreadcrumbList({
    locale,
    siteUrl,
    items: [
      { name: tMeta('breadcrumbHome'), path: '' },
      { name: tMeta('breadcrumbProjects'), path: '/projets' },
      { name: project.title, path: `/projets/${slug}` },
    ],
  })
```

> **Notes** :
> - `project.title` est déjà localisé via `localizeProject(project, locale)` à l'intérieur de `findPublishedBySlug`. Pas besoin de retraiter.
> - `slug` est déjà disponible dans la portée via `await setupLocalePage(params)` qui retourne `{ locale, slug }`.
> - L'appel `findPublishedBySlug` est cachée `'use cache'` + `cacheTag('projects')` (cf. [src/server/queries/projects.ts:27](../../../src/server/queries/projects.ts#L27)) → l'appel ici hit le cache déjà chaud (`generateMetadata` du sub-project 01 + composant page actuel le rappellent déjà).

- [ ] **Step 3 : Injecter `<JsonLd>` à la fin du JSX retourné**

Juste avant la balise fermante de `<CaseStudyLayout>` (ou wrapper équivalent) :

```tsx
      <JsonLd data={breadcrumbJsonLd} />
```

- [ ] **Step 4 : Vérifier compilation**

Run : `pnpm typecheck`
Expected : 0 erreur.

---

## Task 11 : Quality gates statiques

**Files :** aucun, lancement des outils.

- [ ] **Step 1 : Lint**

Run : `pnpm lint` (ou `just lint`)
Expected : 0 erreur, 0 warning bloquant. Pas de violation des règles ESLint sur les nouveaux fichiers.

- [ ] **Step 2 : Typecheck complet**

Run : `just typecheck` (lance `pnpm next typegen && pnpm typecheck`)
Expected : 0 erreur. Vérifier en particulier que `ProfilePagePersonInput`, `BreadcrumbListInput`, et les retours typés sont correctement résolus.

- [ ] **Step 3 : Tests unit complets**

Run : `just test-unit` (`pnpm vitest run --project unit --passWithNoTests`)
Expected : tous les tests unit passent, dont les 15 cas de `src/lib/seo/json-ld.test.ts`. Aucun test des sub-projects 01 + 03 ne régresse.

- [ ] **Step 4 : Tests integration (sanity check)**

Run : `just test-integration`
Expected : suites integration vertes. Le sub-project 05 ne touche pas aux Server Actions ni aux queries Prisma.

- [ ] **Step 5 : Build standalone**

Run : `pnpm build`
Expected : build complet sans erreur. Vérifier qu'aucun warning sur les nouveaux fichiers ou les modifications de pages.

---

## Task 12 : Validation manuelle end-to-end (5 scénarios spec)

**Files :** aucun, vérification HTML + outils Google.

> **Pré-requis** : `docker compose up -d --wait postgres`, `.env` rempli, au moins 1 projet `PUBLISHED` en base.

- [ ] **Step 1 : Build prod local**

Run : `pnpm build && pnpm start`
Expected : `next start` écoute sur `http://localhost:3000`. `NODE_ENV` = `production`.

- [ ] **Step 2 : Scénario 1 spec — ProfilePage+Person sur /fr/a-propos**

Run : `curl -s http://localhost:3000/fr/a-propos | grep -A 1 'application/ld+json'`
Expected : présence de la balise `<script type="application/ld+json">` suivie d'un JSON contenant `"@type":"ProfilePage"`, `"@type":"Person"`, `"name":"Thibaud Geisler"`, `"jobTitle":"IA & développement full-stack"`, `"url":"http://localhost:3000/fr/a-propos"`, `"sameAs":[...linkedin..., ...github...]`, `"knowsAbout":[...]`.

Pour inspection complète :

Run : `curl -s http://localhost:3000/fr/a-propos | grep -oE '<script type="application/ld\+json">[^<]+</script>' | head -1`
Expected : ligne unique avec le JSON-LD complet sans `</script>` non échappé (présence de `<` si le contenu contient des `<`).

- [ ] **Step 3 : Scénario 2 spec — même page en EN**

Run : `curl -s http://localhost:3000/en/a-propos | grep -oE '"jobTitle":"[^"]+"'`
Expected : `"jobTitle":"AI & full-stack development"` (traduction EN).

Run : `curl -s http://localhost:3000/en/a-propos | grep -oE '"url":"[^"]+"' | head -1`
Expected : `"url":"http://localhost:3000/en/a-propos"` (locale EN dans l'URL).

- [ ] **Step 4 : Scénario 3 spec — BreadcrumbList sur /fr/services**

Run : `curl -s http://localhost:3000/fr/services | grep -oE '<script type="application/ld\+json">[^<]+</script>'`
Expected : ligne contenant `"@type":"BreadcrumbList"`, `"position":1,"name":"Accueil"`, `"position":2,"name":"Services"`, URLs `http://localhost:3000/fr` et `http://localhost:3000/fr/services`.

- [ ] **Step 5 : Scénario 4 spec — BreadcrumbList dynamique sur /fr/projets/[slug]**

Identifier un slug PUBLISHED via `pnpm tsx -e "import { prisma } from './src/lib/prisma'; const p = await prisma.project.findFirst({ where: { status: 'PUBLISHED' }, select: { slug: true, titleFr: true } }); console.log(p); await prisma.\$disconnect();"`. Noter le slug et le titre FR.

Run : `curl -s http://localhost:3000/fr/projets/<slug-relevé> | grep -oE '<script type="application/ld\+json">[^<]+</script>'`
Expected : 3 ListItems, position 1 = "Accueil", position 2 = "Projets", position 3 = `<titre-projet-FR>`, dernier `item` = `http://localhost:3000/fr/projets/<slug>`.

- [ ] **Step 6 : Scénario 5 spec — échappement `</script>`**

Run : `curl -s http://localhost:3000/fr/a-propos | grep -c '\\u003c'`
Expected : `> 0` (au moins une occurrence d'échappement, prouvant que le mécanisme est actif).

Run : `curl -s http://localhost:3000/fr/a-propos | awk '/<script type="application\/ld\+json">/,/<\/script>/' | grep -c '</script>' | head -1`
Expected : `1` (le `</script>` de fermeture du tag, mais aucun à l'intérieur du JSON).

- [ ] **Step 7 : Validation Google Rich Results Test (recommandé, optionnel via tunneling)**

> Cette étape valide définitivement les rich results. Elle nécessite que l'URL soit accessible publiquement (Google ne peut pas tester `localhost`).

**Option A — Tunneling pour tester en local :**
```bash
# ngrok (compte gratuit requis)
ngrok http 3000
# OU cloudflared
cloudflared tunnel --url http://localhost:3000
```

Soumettre les URLs tunnelées à [https://search.google.com/test/rich-results](https://search.google.com/test/rich-results) :
- `<tunnel>/fr/a-propos` → attendu : "Profile page" éligible, 0 erreur
- `<tunnel>/en/a-propos` → idem
- `<tunnel>/fr/services` → "Breadcrumbs" éligible
- `<tunnel>/fr/projets` → idem
- `<tunnel>/fr/projets/<slug>` → idem

**Option B — Déférer au déploiement prod :**
Faire la même validation après merge sur `develop` puis `main` et auto-déploiement Dokploy. Soumettre `https://thibaud-geisler.com/fr/a-propos` etc. à Google Rich Results Test directement.

- [ ] **Step 8 : Stopper le serveur prod**

Run : `just stop`.

---

## Self-review (post-écriture, fait par l'auteur du plan)

1. **Couverture spec** :
   - Constante `EXPERTISE` (4 disciplines, 3 avec Wikidata + 1 sans) → Task 1 ✅
   - Helper `buildProfilePagePerson` (signature + types + logique mapExpertise) → Tasks 2, 4 ✅
   - Helper `buildBreadcrumbList` (signature + items + position 1-based + URL absolue) → Tasks 3, 4 ✅
   - 15 tests unit (10 buildProfilePagePerson incluant `Person.@id` locale-agnostic + 5 buildBreadcrumbList) → Tasks 2-3 ✅
   - Server Component `<JsonLd>` avec échappement `<` → Task 5 ✅
   - Extension `messages/{fr,en}.json` (jobTitle + 3 breadcrumbs) → Task 6 ✅
   - Intégration 4 pages → Tasks 7-10 ✅
   - 5 scénarios Acceptance criteria → Task 12 (Steps 2-6) ✅
   - Edge cases (mix string|Thing, trailing slash siteUrl, échappement) → Task 4 (`normalizeBase`, `mapExpertise`) + Task 5 (`replace(/</g, '\\u003c')`) ✅
   - 2 décisions architecturales (Thing+Wikidata + config typée) → Tasks 1, 4 (implémentation reflète les décisions) ✅
   - Pas de modification de `src/lib/seo.ts`, `src/server/queries/projects.ts`, `src/config/social-links.ts` → respecté ✅
   - Pages `/` et `/contact` non touchées (YAGNI tracé) → respecté ✅

2. **Placeholder scan** :
   - Aucun `TBD` / `TODO` / `à compléter` dans les snippets de code.
   - Toutes les commandes `pnpm` / `just` / `curl` sont exactes et reproductibles.
   - Le slug projet utilisé dans Task 12 Step 5 est explicitement à relever via `pnpm tsx`, pas hardcodé.
   - Les Wikidata IDs (Q11660, Q638608, Q386275) sont tous validés.
   - Aucun "similar to Task N" : chaque task contient son code complet.

3. **Type consistency** :
   - `ProfilePagePersonInput` (Task 4) consommé tel quel dans Task 7 (`/a-propos`).
   - `BreadcrumbListInput` (Task 4) consommé tel quel dans Tasks 8-10 (`/services`, `/projets`, `/projets/[slug]`).
   - `ExpertiseEntry` (interne à Task 4) compatible avec le type `Expertise` exporté depuis `src/config/expertise.ts` (Task 1) — les deux ont `name: string`, `wikidataId?: string`, `wikipediaUrl?: string`.
   - `KnowsAboutEntry` union `string | Thing` cohérente entre les tests (Task 2) et l'implémentation (Task 4).
   - `Locale` importé depuis `next-intl` dans Task 4, propagé via les inputs des helpers, cohérent avec `setupLocalePage` du sub-project 01.
   - Clés i18n `Metadata.jobTitle`, `Metadata.breadcrumbHome`, `Metadata.breadcrumbServices`, `Metadata.breadcrumbProjects` ajoutées en Task 6, consommées en Tasks 7-10.
   - `siteUrl` (sub-project 01) consommé read-only dans Tasks 7-10.

Plan complet.
